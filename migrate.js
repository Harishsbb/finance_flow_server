require('dotenv').config();
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Force Node.js to use public DNS servers for resolving SRV records

const mongoose = require('mongoose');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Models
const BankAccount = require('./src/models/BankAccount');
const Budget = require('./src/models/Budget');
const Expense = require('./src/models/Expense');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

async function runMigration() {
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('\n❌ ERROR: serviceAccountKey.json is missing!');
    console.error('To migrate data, you need to download a service account key from Firebase:');
    console.error('1. Go to Firebase Console -> Project Settings -> Service Accounts.');
    console.error('2. Click "Generate new private key".');
    console.error('3. Save the downloaded file as "serviceAccountKey.json" inside the "finance_flow_server" directory.');
    console.error('4. Re-run this migration script: npm run migrate\n');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Connected.');

  console.log('Initializing Firebase Admin SDK...');
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const db = admin.firestore();
  console.log('Firebase Connected.');

  try {
    console.log('\nStarting Migration...');

    // Fetch all user document IDs
    const usersSnap = await db.collection('users').get();
    const userDocs = usersSnap.docs;

    console.log(`Found ${userDocs.length} users in Firestore.`);

    let totalAccounts = 0;
    let totalBudgets = 0;
    let totalExpenses = 0;

    for (const userDoc of userDocs) {
      const userId = userDoc.id;
      console.log(`\nMigrating data for user: ${userId}`);

      // --- Migrate Bank Accounts ---
      const accountsSnap = await db.collection('users').doc(userId).collection('accounts').get();
      console.log(`  Found ${accountsSnap.docs.length} bank accounts.`);
      for (const doc of accountsSnap.docs) {
        const data = doc.data();
        await BankAccount.findOneAndUpdate(
          { id: doc.id, userId },
          {
            id: doc.id,
            name: data.name || 'Unnamed Account',
            balance: Number(data.balance ?? 0),
            type: Number(data.type ?? 0),
            userId,
          },
          { upsert: true, new: true }
        );
        totalAccounts++;
      }

      // --- Migrate Budgets ---
      const budgetsSnap = await db.collection('users').doc(userId).collection('budgets').get();
      console.log(`  Found ${budgetsSnap.docs.length} budgets.`);
      for (const doc of budgetsSnap.docs) {
        const data = doc.data();
        await Budget.findOneAndUpdate(
          { userId, category: data.category, isIncome: data.isIncome ?? false },
          {
            limit: Number(data.limit ?? 0),
          },
          { upsert: true, new: true }
        );
        totalBudgets++;
      }

      // --- Migrate Expenses ---
      const expensesSnap = await db.collection('users').doc(userId).collection('expenses').get();
      console.log(`  Found ${expensesSnap.docs.length} transactions.`);
      for (const doc of expensesSnap.docs) {
        const data = doc.data();
        await Expense.findOneAndUpdate(
          { id: doc.id, userId },
          {
            id: doc.id,
            amount: Number(data.amount ?? 0),
            category: data.category || 'Other',
            dateTime: data.dateTime ? new Date(data.dateTime) : new Date(),
            accountId: data.accountId || '',
            note: data.note || null,
            isIncome: data.isIncome ?? false,
            userId,
          },
          { upsert: true, new: true }
        );
        totalExpenses++;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`Total bank accounts migrated: ${totalAccounts}`);
    console.log(`Total budgets migrated:       ${totalBudgets}`);
    console.log(`Total transactions migrated:  ${totalExpenses}`);

  } catch (error) {
    console.error('Migration failed with error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runMigration();
