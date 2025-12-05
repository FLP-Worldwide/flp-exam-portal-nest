import {
  BadRequestException,
  Body,
  Controller,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

import { User } from '../user/schemas/user.schema';
import { CourseTest } from '../course-test/schemas/course-test.schema';
import { UserAssignment } from '../user/schemas/userAssignment.schema';
import { StudentDetails } from 'src/user/schemas/student.schema';
import { Payment } from './payment.schema';

@Controller('shop')
export class ShopController {
  // Razorpay instance ko any rakh lo, type issues nahi aayenge
  private razorpay: any;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(CourseTest.name)
    private readonly courseTestModel: Model<CourseTest>,
    @InjectModel(UserAssignment.name)
    private readonly assignmentModel: Model<UserAssignment>,
    @InjectModel(StudentDetails.name)
    private studentDetailsModel: Model<StudentDetails>,
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
  ) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string ,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });
  }

  // ---- PACK CONFIG ----
  private PACK_SIZES: Record<string, number> = {
    'pack-1': 1,
    'pack-3': 3,
    'pack-5': 5,
    'pack-10': 10,
  };

  // INR me prices (example, apne hisaab se change kar sakte ho)
  // amount paise me (e.g. 199 = 19900)
  private PACK_PRICES: Record<string, number> = {
    'pack-1': 500,
    'pack-3': 1200,
    'pack-5': 1750,
    'pack-10': 3000,
  };

  // 1️⃣ STEP: Order create karo, frontend ko order + keyId do
  @Post('buy-test/create-order')
  async createOrder(@Body() body: any) {
    const { name, email, phone, city, packId } = body;

    if (!name || !email || !packId) {
      throw new BadRequestException(
        'Name, email, phone and packId are required.',
      );
    }

    const testsToAssign = this.PACK_SIZES[packId];
    const amount = this.PACK_PRICES[packId];

    if (!testsToAssign || !amount) {
      throw new BadRequestException('Invalid packId.');
    }

    // Razorpay order options (yahan koi Razorpay.* type use nahi kiya)
    const options = {
      amount: amount * 100, // paise me
      currency: 'INR',
      receipt: `order_rcpt_${Date.now()}`,
      notes: {
        email,
        packId,
      },
    };

    const order = await this.razorpay.orders.create(options);

    return {
      success: true,
      message: 'Order created successfully',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // frontend ko chahiye hoga
      userInfo: { name, email, phone, city, packId },
    };
  }

  // 2️⃣ STEP: Payment verify + user + tests assign
  @Post('buy-test/verify-payment')
  async verifyPayment(@Body() body: any) {
    const {
      // payment success se aane wale params (frontend se)
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // plus tumhare user details / pack:
      name,
      email,
      phone,
      city,
      packId,
    } = body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      throw new BadRequestException('Payment details are incomplete.');
    }

    if (!name || !email || !phone || !packId) {
      throw new BadRequestException(
        'Name, email, phone and packId are required.',
      );
    }

    const testsToAssign = this.PACK_SIZES[packId];
    if (!testsToAssign) {
      throw new BadRequestException('Invalid packId.');
    }

    // ---- Verify Signature ----
    const keySecret = process.env.RAZORPAY_KEY_SECRET as string;

    const bodyString = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(bodyString)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new BadRequestException('Invalid payment signature.');
    }

    // Yahan tak aa gaye = PAYMENT SUCCESS + VERIFIED ✅

    // 🔹 Find or create user
    let user = await this.userModel.findOne({ email });

    if (!user) {
      const hashedPassword = await bcrypt.hash('student123', 10);

      user = await this.userModel.create({
        name,
        email,
        phone,
        city,
        password: hashedPassword,
        role: 'student',
      });

      const studentDetails = {
        userId: user._id,
        enrollmentNo:
          'STUD' + Math.floor(100000 + Math.random() * 900000),
      };
      const userDetails =
        await this.studentDetailsModel.create(studentDetails);
      (user as any).studentDetails = userDetails._id;
      await user.save();
    }


    const amount = this.PACK_PRICES[packId] || 0;

    await this.paymentModel.create({
      userId: user._id,
      packId,
      amount,
      currency: 'INR',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      paymentResponse: body, // poora body dump
      status: 'success',
      email,
      phone,
    });

    // 🔹 Find existing test assignments
    const existingAssignments = await this.assignmentModel
      .find({ userId: user._id })
      .select('testId')
      .lean();

    const alreadyAssignedIds = new Set(
      existingAssignments.map((t: any) => String(t.testId)),
    );

    // 🔹 Find tests not assigned before
    const availableTests = await this.courseTestModel
      .find({
        _id: { $nin: Array.from(alreadyAssignedIds) },
      })
      .lean();

    if (!availableTests.length) {
      throw new BadRequestException(
        'No more tests available to assign for this user.',
      );
    }

    // 🔹 Random shuffle
    const shuffled = [...availableTests].sort(
      () => Math.random() - 0.5,
    );

    // 🔹 slice based on pack size
    const selectedTests = shuffled.slice(0, testsToAssign);

    // 🔹 Assign tests
    const docs = selectedTests.map((test) => ({
      userId: user._id,
      testId: test._id,
      paymentOrderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    }));

    await this.assignmentModel.insertMany(docs);

    return {
      success: true,
      message: 'Payment verified and test pack assigned successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      packId,
      testsRequested: testsToAssign,
      testsAssigned: selectedTests.length,
      assignedTests: selectedTests.map((t: any) => ({
        testId: t._id,
        title: t.testName,
      })),
    };
  }
}
