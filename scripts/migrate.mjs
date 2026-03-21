import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL, { arrayMode: false, fullResults: false });

const statements = [
  `CREATE SCHEMA IF NOT EXISTS "public"`,
  `CREATE TYPE "IntegrationType" AS ENUM ('GOOGLE_CALENDAR', 'CANVAS', 'GMAIL', 'GRADESCOPE', 'ED_DISCUSSION')`,
  `CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'ERROR', 'DISABLED')`,
  `CREATE TYPE "DeadlineSource" AS ENUM ('GOOGLE_CALENDAR', 'CANVAS', 'GMAIL', 'GRADESCOPE', 'ED_DISCUSSION', 'MANUAL')`,
  `CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT')`,
  `CREATE TYPE "DeadlineStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED')`,

  `CREATE TABLE "User" ("id" TEXT NOT NULL, "name" TEXT, "email" TEXT, "emailVerified" TIMESTAMP(3), "image" TEXT, "phone" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "Account" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" TEXT NOT NULL, "provider" TEXT NOT NULL, "providerAccountId" TEXT NOT NULL, "refresh_token" TEXT, "access_token" TEXT, "expires_at" INTEGER, "token_type" TEXT, "scope" TEXT, "id_token" TEXT, "session_state" TEXT, CONSTRAINT "Account_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "Session" ("id" TEXT NOT NULL, "sessionToken" TEXT NOT NULL, "userId" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "VerificationToken" ("identifier" TEXT NOT NULL, "token" TEXT NOT NULL, "expires" TIMESTAMP(3) NOT NULL)`,
  `CREATE TABLE "Integration" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "type" "IntegrationType" NOT NULL, "token" TEXT, "baseUrl" TEXT, "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE', "lastSync" TIMESTAMP(3), "error" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Integration_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "Deadline" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "dueAt" TIMESTAMP(3) NOT NULL, "source" "DeadlineSource" NOT NULL, "courseName" TEXT, "priority" "Priority" NOT NULL DEFAULT 'MEDIUM', "status" "DeadlineStatus" NOT NULL DEFAULT 'PENDING', "externalId" TEXT, "url" TEXT, "suggested" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "Task" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "deadlineId" TEXT, "title" TEXT NOT NULL, "completed" BOOLEAN NOT NULL DEFAULT false, "sortOrder" INTEGER NOT NULL DEFAULT 0, "estimateMinutes" INTEGER, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Task_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "StudySession" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL, "taskId" TEXT, "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "NotificationPrefs" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "emailEnabled" BOOLEAN NOT NULL DEFAULT true, "pushEnabled" BOOLEAN NOT NULL DEFAULT false, "smsEnabled" BOOLEAN NOT NULL DEFAULT false, "dailyDigest" BOOLEAN NOT NULL DEFAULT true, "reminderHours" INTEGER NOT NULL DEFAULT 24, "urgentHours" INTEGER NOT NULL DEFAULT 2, CONSTRAINT "NotificationPrefs_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "NotificationLog" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "deadlineId" TEXT NOT NULL, "channel" TEXT NOT NULL, "type" TEXT NOT NULL, "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id"))`,
  `CREATE TABLE "PushSubscription" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "endpoint" TEXT NOT NULL, "p256dh" TEXT NOT NULL, "auth" TEXT NOT NULL, CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"))`,

  `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,
  `CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId")`,
  `CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken")`,
  `CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token")`,
  `CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token")`,
  `CREATE UNIQUE INDEX "Integration_userId_type_key" ON "Integration"("userId", "type")`,
  `CREATE INDEX "Deadline_userId_dueAt_idx" ON "Deadline"("userId", "dueAt")`,
  `CREATE INDEX "Deadline_userId_status_idx" ON "Deadline"("userId", "status")`,
  `CREATE UNIQUE INDEX "Deadline_userId_source_externalId_key" ON "Deadline"("userId", "source", "externalId")`,
  `CREATE INDEX "Task_deadlineId_sortOrder_idx" ON "Task"("deadlineId", "sortOrder")`,
  `CREATE INDEX "StudySession_userId_startAt_idx" ON "StudySession"("userId", "startAt")`,
  `CREATE UNIQUE INDEX "NotificationPrefs_userId_key" ON "NotificationPrefs"("userId")`,
  `CREATE UNIQUE INDEX "NotificationLog_userId_deadlineId_channel_type_key" ON "NotificationLog"("userId", "deadlineId", "channel", "type")`,
  `CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId")`,

  `ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Integration" ADD CONSTRAINT "Integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "Task" ADD CONSTRAINT "Task_deadlineId_fkey" FOREIGN KEY ("deadlineId") REFERENCES "Deadline"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "NotificationPrefs" ADD CONSTRAINT "NotificationPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
];

let success = 0;
for (const stmt of statements) {
  try {
    await sql.query(stmt);
    success++;
  } catch (e) {
    console.error(`Failed: ${stmt.slice(0, 60)}...`);
    console.error(`  Error: ${e.message}`);
  }
}

console.log(`\nExecuted ${success}/${statements.length} statements`);

const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
console.log('Tables:', tables.map(t => t.tablename).join(', '));
