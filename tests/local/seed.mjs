import { createRequire } from "node:module";
import { randomUUID, randomInt } from "node:crypto";
import { mongoose } from "./runtime.mjs";
import { UserModel } from "../../../backend/src/shared/models/user.model.js";
import { StoreModel } from "../../../backend/src/shared/models/store.model.js";
import { ProductModel } from "../../../backend/src/seller/models/product.model.js";
import { OrderModel } from "../../../backend/src/user/models/order.model.js";
import { encryptStoreData } from "../../../backend/src/utils/store-crypto.js";
import { hashAdminPassword } from "../../../backend/src/shared/services/auth.service.js";
import { createReviewService } from "../../../backend/src/reviews/review.service.js";
import { createReviewRepository } from "../../../backend/src/reviews/review.repository.js";
import { createCatalogRepository } from "../../../backend/src/user/repositories/catalog.repository.js";
import { NotificationJobModel } from "../../../backend/src/notifications/models/notification-job.model.js";
import { DispatchSettingsModel } from "../../../backend/src/admin/settings/dispatch-settings.model.js";
import { seedPagination } from "./pagination.mjs";

const requireBackend = createRequire(
  new URL("../../../backend/package.json", import.meta.url),
);
const sharp = requireBackend("sharp");
const address = {
  name: "Isolated Buyer",
  line1: "12 Test Market Road",
  locality: "Test Market",
  city: "Kupwara",
  district: "Kupwara",
  state: "Jammu and Kashmir",
  pincode: "193222",
};
let state;
export function fixtureState() {
  return state;
}
export async function seed({ pagination = false } = {}) {
  if (!mongoose.connection.name.startsWith("zippcart_web_phase2_"))
    throw new Error("Unsafe fixture database.");
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
  // Deterministic working calendar in this disposable DB, independent of Sunday
  // or a developer's settings. Separate UI tests exercise weekly offs/holidays.
  await DispatchSettingsModel.create({
    key: "dispatch",
    weeklyOffDays: [],
    cutoffMinutes: 1439,
    holidays: [],
  });
  const photoBytes = await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#9448bb" },
  })
    .jpeg()
    .toBuffer();
  const photo = `data:image/jpeg;base64,${photoBytes.toString("base64")}`;
  const document = {
    mimeType: "image/jpeg",
    base64: photoBytes.toString("base64"),
  };
  const admin = await UserModel.create({
    phone: process.env.WEB_TEST_ADMIN_PHONE,
    adminPasswordHash: await hashAdminPassword(
      process.env.WEB_TEST_ADMIN_PASSWORD,
    ),
    roles: ["customer", "admin"],
    fullName: "Isolated Admin",
  });
  const seller = await UserModel.create({
    phone: process.env.WEB_TEST_SELLER_PHONE,
    roles: ["customer", "seller"],
    storeStatus: "approved",
    isActive: true,
    fullName: "Isolated Seller",
    passwordHash: await hashAdminPassword(process.env.WEB_TEST_SELLER_PASSWORD),
  });
  const usedPhones = new Set([
    process.env.WEB_TEST_ADMIN_PHONE,
    process.env.WEB_TEST_SELLER_PHONE,
    process.env.WEB_TEST_APPLICANT_PHONE,
  ]);
  const phone = () => {
    let next;
    do {
      next = `9${randomInt(100000000, 1000000000)}`;
    } while (usedPhones.has(next));
    usedPhones.add(next);
    return next;
  };
  address.phone = phone();
  const buyer = await UserModel.create({
    phone: address.phone,
    fullName: address.name,
  });
  const otherSeller = await UserModel.create({
    phone: phone(),
    roles: ["customer", "seller"],
    storeStatus: "approved",
    isActive: true,
  });
  const applicant = await UserModel.create({
    phone: process.env.WEB_TEST_APPLICANT_PHONE,
    fullName: "Isolated Applicant",
    workspaceSellerInvited: true,
    passwordHash: await hashAdminPassword(
      process.env.WEB_TEST_APPLICANT_PASSWORD,
    ),
  });
  const pendingOwner = await UserModel.create({
    phone: phone(),
    storeStatus: "pending",
    passwordHash: await hashAdminPassword(process.env.WEB_TEST_SELLER_PASSWORD),
  });
  const rejectedOwner = await UserModel.create({
    phone: phone(),
    storeStatus: "rejected",
    passwordHash: await hashAdminPassword(process.env.WEB_TEST_SELLER_PASSWORD),
  });
  async function store(owner, storeName, status = "approved") {
    return StoreModel.create({
      ownerId: owner._id,
      storeName,
      storeCategory: "Clothing",
      locality: "Test Market",
      pincode: "193222",
      payoutMethod: "upi",
      privateData: encryptStoreData(
        {
          ownerFullName: owner.fullName ?? "Isolated Owner",
          mobileNumber: owner.phone,
          fullAddress: "12 Test Market Road, Kupwara",
          payout: { method: "upi", upiId: "isolated@bank" },
          documents: {
            storeFrontPhoto: document,
            aadhaarCard: document,
            panCard: document,
            shopLicense: document,
          },
        },
        String(owner._id),
      ),
      status,
      isActive: status === "approved",
      isOpen: true,
      termsVersion: "2026-09-11",
      termsAcceptedAt: new Date(),
      applicationRevision: 1,
    });
  }
  const ownStore = await store(seller, "Isolated Fashion");
  const otherStore = await store(otherSeller, "Other Owned Store");
  const pendingStore = await store(pendingOwner, "Pending Shop", "pending");
  const rejectedStore = await store(rejectedOwner, "Rejected Shop", "rejected");
  const rejectionTarget = await store(
    await UserModel.create({ phone: phone(), storeStatus: "pending" }),
    "Review rejection shop",
    "pending",
  );
  async function product(name, extra = {}) {
    return ProductModel.create({
      storeId: ownStore._id,
      name,
      category: "Fashion",
      description: "Cotton test garment for isolated acceptance.",
      sku: randomUUID(),
      price: 500,
      mrp: 600,
      stock: 20,
      images: [photo],
      coverImage: photo,
      approvedVersion: 1,
      moderationStatus: "approved",
      submissionVersion: 1,
      ...extra,
    });
  }
  const liveProduct = await product("Live Cotton Shirt");
  const pendingProduct = await product("Pending Cotton Shirt", {
    approvedVersion: 0,
    moderationStatus: "pending",
    pendingChanges: {
      name: "Pending Cotton Shirt",
      category: "Fashion",
      description: "Pending cotton shirt description.",
      brand: "",
      customCategory: "",
      price: 500,
      mrp: 600,
      images: [photo],
      colors: [],
      sizes: [],
    },
    pendingInventory: {
      stock: 20,
      variantStock: [],
      expectedInventoryRevision: 0,
    },
  });
  const archiveProduct = await product("Archive Me");
  const deleteProduct = await product("Delete Me", {
    approvedVersion: 0,
    moderationStatus: "rejected",
  });
  const lowProduct = await product("Low Stock Shirt", { stock: 1 });
  const foreignProduct = await product("Foreign Store Shirt", {
    storeId: otherStore._id,
  });
  async function order(name, extra = {}, targetProduct = liveProduct) {
    const id = new mongoose.Types.ObjectId();
    const item = {
      productId: String(targetProduct._id),
      storeId: String(targetProduct.storeId),
      name,
      quantity: 1,
      price: 500,
      color: "",
      size: "",
    };
    return OrderModel.create({
      _id: id,
      userId: buyer._id,
      checkoutKey: randomUUID(),
      cartKey: randomUUID(),
      publicReference: String(id).slice(-8).toUpperCase(),
      items: [item],
      cartSnapshot: [],
      shippingAddress: address,
      billingAddress: address,
      subtotal: 500,
      delivery: 40,
      total: 540,
      shipments: [{ storeId: item.storeId, status: "placed" }],
      notificationStatuses: [{ status: "placed", state: "done" }],
      ...extra,
    });
  }
  const placed = await order("Live Cotton Shirt");
  const attention = await order("Stock issue shirt", {
    shipments: [
      {
        storeId: String(ownStore._id),
        status: "placed",
        stockIssue: {
          open: true,
          note: "Stock damaged on the shelf",
          reportedAt: new Date(),
          resolvedAt: null,
        },
      },
    ],
  });
  const delivered = await order("Delivered Shirt", {
    status: "delivered",
    receivedAt: new Date(),
    paymentStatus: "paid",
    shipments: [{ storeId: String(ownStore._id), status: "dispatched" }],
  });
  const collection = await order("Collect Cash Shirt", {
    status: "delivered",
    receivedAt: new Date(),
    paymentStatus: "unpaid",
    shipments: [{ storeId: String(ownStore._id), status: "dispatched" }],
  });
  const cleared = await order("Cleared Shirt", {
    status: "delivered",
    receivedAt: new Date(Date.now() - 15 * 86400000),
    paymentStatus: "paid",
    shipments: [{ storeId: String(ownStore._id), status: "dispatched" }],
  });
  const legacy = await order("Earlier Return Shirt", {
    status: "return_requested",
    returnRequestedAt: new Date(),
    returnRequestId: randomUUID(),
    returnPreference: "refund",
    returnReason: "size_fit",
    returnDescription: "Old read-only return request",
  });
  const foreign = await order("Foreign Store Shirt", {}, foreignProduct);
  const recovery = await order("Recover Cotton Shirt", {
    status: "dispatched",
    shipments: [{ storeId: String(ownStore._id), status: "dispatched" }],
    rto: {
      id: randomUUID(),
      requestKey: randomUUID(),
      status: "requested",
      reason: "Customer no longer needs this parcel",
      requestedAt: new Date(),
      updatedAt: new Date(),
      requestedBy: buyer._id,
      sellers: [{ storeId: String(ownStore._id) }],
      refund: { status: "not_required" },
      history: [
        {
          action: "request",
          status: "requested",
          actorRole: "customer",
          actorId: buyer._id,
          at: new Date(),
        },
      ],
    },
  });
  const caseId = String(new mongoose.Types.ObjectId());
  await OrderModel.updateOne(
    { _id: delivered._id },
    {
      $set: {
        returnCases: [
          {
            id: caseId,
            requestId: `RET-${caseId.toUpperCase()}`,
            clientKey: randomUUID(),
            storeId: String(ownStore._id),
            status: "under_review",
            preference: "refund",
            reason: "size_fit",
            description: "Wrong fit, please arrange pickup",
            items: [
              {
                index: 0,
                productId: String(liveProduct._id),
                name: "Delivered Shirt",
                price: 500,
                quantity: 1,
                color: "",
                size: "",
              },
            ],
            photoIds: [],
            pickupAddress: address,
            refundMethod: "cash",
            amount: 500,
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            history: [
              {
                id: randomUUID(),
                action: "request",
                actor: "customer",
                actorId: String(buyer._id),
                at: new Date(),
                note: "Wrong fit, please arrange pickup",
                status: "under_review",
              },
            ],
          },
        ],
      },
    },
  );
  const reviewService = createReviewService(
    createReviewRepository(),
    createCatalogRepository(),
  );
  const review = await reviewService.create(
    { id: String(buyer._id), fullName: buyer.fullName, roles: buyer.roles },
    {
      orderId: String(delivered._id),
      itemIndex: 0,
      rating: 4,
      title: "Comfortable shirt",
      comment: "The cotton fabric is soft and comfortable.",
      images: [],
      policyVersion: "2026-11-07",
    },
  );
  const extraCases = {};
  for (const [key, preference, status, refundMethod] of [
    ["exchange", "exchange", "under_review", "cash"],
    ["dispute", "refund", "under_review", "cash"],
    ["information", "refund", "under_review", "cash"],
    ["original", "refund", "refund_pending", "original"],
  ]) {
    const recordOrder = await order(`${key} support shirt`, {
      status: "delivered",
      receivedAt: new Date(),
      paymentStatus: "paid",
      shipments: [{ storeId: String(ownStore._id), status: "dispatched" }],
    });
    const recordId = String(new mongoose.Types.ObjectId());
    await OrderModel.updateOne(
      { _id: recordOrder._id },
      {
        $set: {
          returnCases: [
            {
              id: recordId,
              requestId: `RET-${recordId.toUpperCase()}`,
              clientKey: randomUUID(),
              storeId: String(ownStore._id),
              status,
              preference,
              reason: "size_fit",
              description: "Isolated support branch acceptance",
              refundMethod,
              amount: 500,
              items: [
                {
                  index: 0,
                  productId: String(liveProduct._id),
                  name: `${key} support shirt`,
                  price: 500,
                  quantity: 1,
                  color: "",
                  size: "",
                  exchangeColor: "",
                  exchangeSize: "",
                },
              ],
              pickupAddress: address,
              photoIds: [],
              version: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
              history: [
                {
                  id: randomUUID(),
                  action: "requested",
                  actor: "customer",
                  actorId: String(buyer._id),
                  at: new Date(),
                  status,
                  note: "Isolated support branch acceptance",
                },
              ],
            },
          ],
        },
      },
    );
    extraCases[`${key}OrderId`] = String(recordOrder._id);
    extraCases[`${key}CaseId`] = recordId;
  }
  await NotificationJobModel.create([
    {
      _id: randomUUID(),
      recipients: [admin._id, seller._id],
      state: "done",
      message: {
        title: "Order updated",
        body: "Your order has an update.",
        data: { type: "order-status", orderId: String(placed._id) },
      },
    },
    {
      _id: randomUUID(),
      recipients: [seller._id],
      state: "done",
      message: {
        title: "Other order updated",
        body: "An account purchase has an update.",
        data: { type: "order-status", orderId: String(foreign._id) },
      },
    },
  ]);
  state = {
    adminId: String(admin._id),
    sellerId: String(seller._id),
    buyerId: String(buyer._id),
    applicantId: String(applicant._id),
    storeId: String(ownStore._id),
    otherStoreId: String(otherStore._id),
    pendingStoreId: String(pendingStore._id),
    rejectionStoreId: String(rejectionTarget._id),
    rejectedStoreId: String(rejectedStore._id),
    productId: String(liveProduct._id),
    pendingProductId: String(pendingProduct._id),
    archiveProductId: String(archiveProduct._id),
    deleteProductId: String(deleteProduct._id),
    lowProductId: String(lowProduct._id),
    foreignProductId: String(foreignProduct._id),
    orderId: String(placed._id),
    attentionOrderId: String(attention._id),
    deliveredOrderId: String(delivered._id),
    collectionOrderId: String(collection._id),
    clearedOrderId: String(cleared._id),
    legacyOrderId: String(legacy._id),
    foreignOrderId: String(foreign._id),
    rtoOrderId: String(recovery._id),
    caseId,
    reviewId: review.id,
    buyerPhone: buyer.phone,
    photo,
    ...extraCases,
  };
  if (pagination) await seedPagination(state);
  return state;
}
