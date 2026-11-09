import { randomInt, randomUUID } from "node:crypto";
import { mongoose } from "./runtime.mjs";
import { UserModel } from "../../../backend/src/shared/models/user.model.js";
import { StoreModel } from "../../../backend/src/shared/models/store.model.js";
import { ProductModel } from "../../../backend/src/seller/models/product.model.js";
import { OrderModel } from "../../../backend/src/user/models/order.model.js";
import { NotificationJobModel } from "../../../backend/src/notifications/models/notification-job.model.js";
import { encryptStoreData } from "../../../backend/src/utils/store-crypto.js";
import { createReviewService } from "../../../backend/src/reviews/review.service.js";
import { createReviewRepository } from "../../../backend/src/reviews/review.repository.js";
import { createCatalogRepository } from "../../../backend/src/user/repositories/catalog.repository.js";

/** Larger data only for pagination acceptance; ordinary workflow fixtures stay small. */
export async function seedPagination(state) {
  const baseOrder = await OrderModel.findById(state.orderId).lean();
  const reviews = createReviewService(
    createReviewRepository(),
    createCatalogRepository(),
  );
  for (let index = 0; index < 35; index++) {
    await ProductModel.create({
      storeId: state.storeId,
      name: `Pagination product ${index}`,
      category: "Fashion",
      description: "Isolated pagination product",
      sku: randomUUID(),
      price: 500,
      mrp: 600,
      stock: 10,
      approvedVersion: 1,
      moderationStatus: "approved",
      images: [state.photo],
      coverImage: state.photo,
    });
    const order = await OrderModel.create({
      userId: state.buyerId,
      checkoutKey: randomUUID(),
      cartKey: randomUUID(),
      items: baseOrder.items,
      cartSnapshot: [],
      shippingAddress: baseOrder.shippingAddress,
      billingAddress: baseOrder.billingAddress,
      subtotal: 500,
      delivery: 40,
      total: 540,
      status: "delivered",
      receivedAt: new Date(),
      paymentStatus: "paid",
      shipments: [{ storeId: state.storeId, status: "dispatched" }],
      notificationStatuses: [{ status: "delivered", state: "done" }],
      returnCases: [
        {
          id: String(new mongoose.Types.ObjectId()),
          clientKey: randomUUID(),
          storeId: state.storeId,
          requestId: `PAGINATION-${index}`,
          status: "under_review",
          preference: "refund",
          reason: "size_fit",
          amount: 500,
          refundMethod: "cash",
          items: [
            {
              index: 0,
              productId: state.productId,
              name: baseOrder.items[0].name,
              quantity: 1,
              price: 500,
              color: "",
              size: "",
            },
          ],
          photoIds: [],
          pickupAddress: baseOrder.shippingAddress,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 0,
          history: [
            {
              id: randomUUID(),
              action: "requested",
              status: "under_review",
              actor: "customer",
              actorId: state.buyerId,
              note: "Pagination acceptance request",
              at: new Date(),
              photoIds: [],
            },
          ],
        },
      ],
    });
    await reviews.create(
      { id: state.buyerId, roles: ["customer"], fullName: "Isolated Buyer" },
      {
        orderId: String(order._id),
        itemIndex: 0,
        rating: 4,
        title: `Pagination review ${index}`,
        comment: "Isolated review pagination acceptance",
        images: [],
        policyVersion: "2026-11-07",
      },
    );
    await NotificationJobModel.create({
      _id: randomUUID(),
      recipients: [state.adminId, state.sellerId],
      state: "done",
      message: {
        title: `Pagination notification ${index}`,
        body: "Isolated inbox pagination acceptance",
        data: { type: "order-status", orderId: String(order._id) },
      },
    });
  }
  const phones = new Set(await UserModel.distinct("phone"));
  for (let index = 0; index < 20; index++) {
    let phone;
    do {
      phone = `9${randomInt(100000000, 1000000000)}`;
    } while (phones.has(phone));
    phones.add(phone);
    const owner = await UserModel.create({
      phone,
      fullName: `Pagination owner ${index}`,
      storeStatus: "pending",
    });
    await StoreModel.create({
      ownerId: owner._id,
      storeName: `Pagination shop ${index}`,
      storeCategory: "Fashion",
      locality: "Isolated market",
      pincode: "193222",
      payoutMethod: "upi",
      status: "pending",
      isActive: false,
      termsVersion: "2026-09-11",
      termsAcceptedAt: new Date(),
      privateData: encryptStoreData(
        {
          ownerFullName: owner.fullName,
          mobileNumber: owner.phone,
          fullAddress: "Isolated market road, Kupwara",
          payout: { method: "upi", upiId: "isolated@bank" },
          documents: {},
        },
        String(owner._id),
      ),
    });
  }
}
