const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const email = process.env.ADMIN_EMAIL;
const serviceAccount = require('./serviceAccountKey.json');

const app = initializeApp({
  credential: cert(serviceAccount)
});

async function makeAdmin() {
  try {
    const auth = getAuth(app);

    if (!email) throw new Error('Set ADMIN_EMAIL to the verified Firebase account email before running this script.');
    const user = await auth.getUserByEmail(email);

    await auth.setCustomUserClaims(user.uid, {
      ...user.customClaims,
      admin: true
    });

    console.log('SUCCESS! Admin permission granted.');
    console.log('Admin Email:', email);

    process.exit(0);
  } catch (error) {
    console.error('ADMIN ERROR:', error.message);
    process.exit(1);
  }
}

makeAdmin();