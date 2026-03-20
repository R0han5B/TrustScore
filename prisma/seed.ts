/**
 * Seed Script - Sample Test Data for MongoDB
 * Run with: bun run prisma/seed.ts
 */

import { PrismaClient, UserRole, ShopCategory, SentimentLabel, AlertType, AlertStatus, BillStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.alert.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.trustScore.deleteMany();
  await prisma.review.deleteMany();
  await prisma.bill.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();

  console.log('✓ Cleared existing data');

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@trustscore.com',
      name: 'Admin User',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isVerified: true,
    },
  });
  console.log('✓ Created admin user:', admin.email);

  // Create Shopkeepers and Shops
  const shopkeepers: { id: string; email: string }[] = [];
  const shops: { id: string; name: string; category: string; registrationNo: string }[] = [];

  const shopData = [
    {
      keeper: { name: 'Rahul Sharma', email: 'rahul@shop.com', phone: '+919876543210' },
      shop: {
        name: 'Sharma Grocery Store',
        description: 'Fresh groceries and daily essentials at best prices. Serving the community for over 15 years.',
        category: 'GROCERY',
        address: '123 Market Street',
        city: 'Mumbai',
        pincode: '400001',
        phone: '+919876543211',
        registrationNo: 'GRO2024001',
      },
    },
    {
      keeper: { name: 'Priya Patel', email: 'priya@restaurant.com', phone: '+919876543220' },
      shop: {
        name: 'Patel Family Restaurant',
        description: 'Authentic Indian cuisine with home-style cooking. Famous for our Gujarati thali.',
        category: 'RESTAURANT',
        address: '45 Food Lane',
        city: 'Delhi',
        pincode: '110001',
        phone: '+919876543221',
        registrationNo: 'RES2024001',
      },
    },
    {
      keeper: { name: 'Amit Kumar', email: 'amit@pharmacy.com', phone: '+919876543230' },
      shop: {
        name: 'Kumar Medical Store',
        description: '24/7 Pharmacy with genuine medicines. All leading brands available at discounted prices.',
        category: 'PHARMACY',
        address: '78 Health Complex',
        city: 'Bangalore',
        pincode: '560001',
        phone: '+919876543231',
        registrationNo: 'PHA2024001',
      },
    },
    {
      keeper: { name: 'Sneha Reddy', email: 'sneha@electronics.com', phone: '+919876543240' },
      shop: {
        name: 'Reddy Electronics',
        description: 'Latest gadgets and electronics at competitive prices. Expert repair services available.',
        category: 'ELECTRONICS',
        address: '90 Tech Park',
        city: 'Hyderabad',
        pincode: '500001',
        phone: '+919876543241',
        registrationNo: 'ELE2024001',
      },
    },
    {
      keeper: { name: 'Vikram Singh', email: 'vikram@clothing.com', phone: '+919876543250' },
      shop: {
        name: 'Singh Fashion Hub',
        description: 'Trendy clothing for all ages. Traditional and modern styles at affordable prices.',
        category: 'CLOTHING',
        address: '22 Fashion Street',
        city: 'Jaipur',
        pincode: '302001',
        phone: '+919876543251',
        registrationNo: 'CLO2024001',
      },
    },
  ];

  for (const data of shopData) {
    const password = await bcrypt.hash('shopkeeper123', 10);
    const keeper = await prisma.user.create({
      data: {
        ...data.keeper,
        passwordHash: password,
        role: 'SHOPKEEPER',
        isVerified: true,
      },
    });
    shopkeepers.push({ id: keeper.id, email: keeper.email });

    const shop = await prisma.shop.create({
      data: {
        ...data.shop,
        ownerId: keeper.id,
        isVerified: true,
        isActive: true,
      },
    });
    shops.push({ 
      id: shop.id, 
      name: shop.name, 
      category: shop.category,
      registrationNo: shop.registrationNo 
    });
  }
  console.log(`✓ Created ${shopkeepers.length} shopkeepers and shops`);

  // Create Customers
  const customers: { id: string; name: string | null; email: string }[] = [];
  const customerData = [
    { name: 'John Doe', email: 'john@email.com', phone: '+919876543001' },
    { name: 'Jane Smith', email: 'jane@email.com', phone: '+919876543002' },
    { name: 'Mike Johnson', email: 'mike@email.com', phone: '+919876543003' },
    { name: 'Sarah Wilson', email: 'sarah@email.com', phone: '+919876543004' },
    { name: 'David Brown', email: 'david@email.com', phone: '+919876543005' },
    { name: 'Emma Davis', email: 'emma@email.com', phone: '+919876543006' },
    { name: 'Robert Miller', email: 'robert@email.com', phone: '+919876543007' },
    { name: 'Lisa Anderson', email: 'lisa@email.com', phone: '+919876543008' },
  ];

  for (const data of customerData) {
    const password = await bcrypt.hash('customer123', 10);
    const customer = await prisma.user.create({
      data: {
        ...data,
        passwordHash: password,
        role: 'CUSTOMER',
        isVerified: true,
      },
    });
    customers.push({ id: customer.id, name: customer.name, email: customer.email });
  }
  console.log(`✓ Created ${customers.length} customers`);

  // Create Bills and Reviews for each shop
  const reviewTexts = {
    positive: [
      'Excellent service and quality products! The staff was very helpful and polite. Prices are reasonable.',
      'Great experience! The shop has a wide variety of products. The owner was very courteous.',
      'Best shop in the area! Quality products at affordable prices. Will definitely recommend to others.',
      'Very satisfied with my purchase. The service was quick and efficient. Good behavior from staff.',
      'Amazing quality and great customer service. Prices are competitive. Highly recommended!',
    ],
    neutral: [
      'Average experience. Products are okay but nothing special. Service could be better.',
      'Decent shop with standard products. Prices are moderate. Nothing exceptional.',
      'The shop is convenient but the variety is limited. Staff behavior is acceptable.',
      'Normal experience. Quality matches the price. Service is average.',
      'It was okay. Nothing great, nothing bad. Just a regular shopping experience.',
    ],
    negative: [
      'Poor quality products. The staff was rude and unhelpful. Prices are too high for the quality.',
      'Disappointed with the service. Had to wait for too long. The product quality was bad.',
      'Not recommended. Overpriced items with poor quality. Bad behavior from the shopkeeper.',
      'Terrible experience! The product was defective and the staff refused to help. Waste of money.',
      'Very bad service. The shopkeeper was rude. Prices are higher compared to other shops.',
    ],
  };

  for (let shopIndex = 0; shopIndex < shops.length; shopIndex++) {
    const shop = shops[shopIndex];
    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

    // Create 10-20 reviews per shop
    const numReviews = 10 + Math.floor(Math.random() * 11);
    let totalSentiment = 0;

    for (let i = 0; i < numReviews; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];

      // Determine sentiment (weighted towards positive for demonstration)
      const sentimentRoll = Math.random();
      let sentiment: 'positive' | 'neutral' | 'negative';
      if (sentimentRoll < 0.5) {
        sentiment = 'positive';
        sentimentCounts.positive++;
      } else if (sentimentRoll < 0.8) {
        sentiment = 'neutral';
        sentimentCounts.neutral++;
      } else {
        sentiment = 'negative';
        sentimentCounts.negative++;
      }

      const texts = reviewTexts[sentiment];
      const reviewText = texts[Math.floor(Math.random() * texts.length)];

      // Calculate sentiment score based on sentiment type
      let sentimentScore: number;
      if (sentiment === 'positive') {
        sentimentScore = 0.3 + Math.random() * 0.6; // 0.3 to 0.9
      } else if (sentiment === 'neutral') {
        sentimentScore = -0.1 + Math.random() * 0.2; // -0.1 to 0.1
      } else {
        sentimentScore = -0.8 + Math.random() * 0.5; // -0.8 to -0.3
      }
      totalSentiment += sentimentScore;

      const sentimentLabel =
        sentimentScore >= 0.1 ? 'POSITIVE' : sentimentScore <= -0.1 ? 'NEGATIVE' : 'NEUTRAL';

      // Create bill
      const bill = await prisma.bill.create({
        data: {
          billNumber: `BILL-${shop.registrationNo}-${Date.now()}-${i}`,
          shopId: shop.id,
          customerId: customer.id,
          billDate: new Date(Date.now() - Math.floor(Math.random() * 50) * 24 * 60 * 60 * 1000),
          totalAmount: 100 + Math.floor(Math.random() * 5000),
          status: BillStatus.USED,
          verifiedAt: new Date(),
        },
      });

      // Generate aspect scores
      const aspects: Record<string, number> = {
        price: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? -0.5 : 0.1,
        quality: sentiment === 'positive' ? 0.8 : sentiment === 'negative' ? -0.6 : 0.0,
        behavior: sentiment === 'positive' ? 0.7 : sentiment === 'negative' ? -0.7 : 0.1,
        service: sentiment === 'positive' ? 0.6 : sentiment === 'negative' ? -0.5 : 0.0,
      };

      // Create review
      await prisma.review.create({
        data: {
          billId: bill.id,
          shopId: shop.id,
          customerId: customer.id,
          reviewText,
          sentimentScore,
          sentimentLabel: sentimentLabel as SentimentLabel,
          aspects: JSON.stringify(aspects),
          isComplaint: sentiment === 'negative',
          complaintStatus: sentiment === 'negative' && Math.random() > 0.5 ? 'pending' : null,
        },
      });
    }

    // Calculate trust score for shop
    const avgSentiment = totalSentiment / numReviews;
    const trustScore = Math.max(0, Math.min(100, 50 + avgSentiment * 50));

    await prisma.trustScore.create({
      data: {
        shopId: shop.id,
        score: trustScore,
        weightedScore: trustScore,
        totalReviews: numReviews,
        positiveCount: sentimentCounts.positive,
        neutralCount: sentimentCounts.neutral,
        negativeCount: sentimentCounts.negative,
        trend: trustScore > 60 ? 'up' : trustScore < 40 ? 'down' : 'stable',
      },
    });

    console.log(`✓ Created ${numReviews} reviews for ${shop.name} (Trust Score: ${trustScore.toFixed(1)})`);
  }

  // Create some alerts
  for (const shop of shops.slice(0, 3)) {
    const keeper = shopkeepers.find((k) => shops.find(s => s.id === shop.id));
    if (keeper) {
      await prisma.alert.create({
        data: {
          shopId: shop.id,
          userId: keeper.id,
          type: AlertType.WEEKLY_REPORT,
          title: 'Weekly Performance Report Ready',
          message: `Your weekly performance report is now available. Check your dashboard for details.`,
        },
      });
    }
  }
  console.log('✓ Created alerts');

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test Accounts:');
  console.log('  Admin: admin@trustscore.com / admin123');
  console.log('  Shopkeeper: rahul@shop.com / shopkeeper123');
  console.log('  Customer: john@email.com / customer123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
