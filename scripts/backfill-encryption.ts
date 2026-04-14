import { db } from '../src/lib/db';
import {
  decryptBillFields,
  decryptJson,
  decryptShopFields,
  decryptUserFields,
  encryptJson,
  encryptValue,
  hashEmailForLookup,
  hashOtpForStorage,
  hashPhoneForLookup,
} from '../src/lib/data-protection';

function looksHashed(value?: string | null) {
  return !!value && /^[a-f0-9]{64}$/i.test(value);
}

async function backfillUsers() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      otpCode: true,
      emailHash: true,
      phoneHash: true,
    },
  });

  for (const user of users) {
    const publicUser = decryptUserFields(user);

    await db.user.update({
      where: { id: user.id },
      data: {
        email: encryptValue(publicUser.email)!,
        emailHash: hashEmailForLookup(publicUser.email),
        name: encryptValue(publicUser.name),
        phone: encryptValue(publicUser.phone),
        phoneHash: hashPhoneForLookup(publicUser.phone),
        otpCode: user.otpCode
          ? looksHashed(user.otpCode)
            ? user.otpCode
            : hashOtpForStorage(user.otpCode)
          : null,
      },
    });
  }

  return users.length;
}

async function backfillShops() {
  const shops = await db.shop.findMany({
    select: {
      id: true,
      phone: true,
      email: true,
    },
  });

  for (const shop of shops) {
    const publicShop = decryptShopFields(shop);

    await db.shop.update({
      where: { id: shop.id },
      data: {
        phone: encryptValue(publicShop.phone),
        email: encryptValue(publicShop.email),
      },
    });
  }

  return shops.length;
}

async function backfillBills() {
  const bills = await db.bill.findMany({
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      customerPhoneHash: true,
      customerEmail: true,
      customerEmailHash: true,
      imageUrl: true,
      ocrData: true,
    },
  });

  for (const bill of bills) {
    const publicBill = decryptBillFields(bill);

    await db.bill.update({
      where: { id: bill.id },
      data: {
        customerName: encryptValue(publicBill.customerName),
        customerPhone: encryptValue(publicBill.customerPhone),
        customerPhoneHash: hashPhoneForLookup(publicBill.customerPhone),
        customerEmail: encryptValue(publicBill.customerEmail),
        customerEmailHash: hashEmailForLookup(publicBill.customerEmail),
        imageUrl: encryptValue(publicBill.imageUrl),
        ocrData: publicBill.ocrData
          ? encryptJson(decryptJson<Record<string, unknown>>(publicBill.ocrData) ?? publicBill.ocrData)
          : null,
      },
    });
  }

  return bills.length;
}

async function main() {
  const [userCount, shopCount, billCount] = await Promise.all([
    backfillUsers(),
    backfillShops(),
    backfillBills(),
  ]);

  console.log(
    `Backfill complete. Users: ${userCount}, Shops: ${shopCount}, Bills: ${billCount}`
  );
}

main()
  .catch((error) => {
    console.error('Encryption backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
