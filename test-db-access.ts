import { db } from './src/lib/db';

async function main() {
  try {
    const userCount = await db.user.count();
    console.log(`Database connection successful. User count: ${userCount}`);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

main();
