-- Create tables
CREATE TABLE IF NOT EXISTS "User" (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  role text DEFAULT 'admin' NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "Rule" (
  id text PRIMARY KEY,
  name text NOT NULL,
  content jsonb NOT NULL,
  version int DEFAULT 1 NOT NULL,
  "createdBy" text NOT NULL,
  "approvedBy" text,
  "createdAt" timestamptz DEFAULT now() NOT NULL,
  "updatedAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  id text PRIMARY KEY,
  entity text NOT NULL,
  "entityId" text NOT NULL,
  action text NOT NULL,
  diff jsonb NOT NULL,
  actor text NOT NULL,
  "approvedBy" text,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "FraudEvent" (
  id text PRIMARY KEY,
  label text NOT NULL,
  features jsonb NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "JobShift" (
  id text PRIMARY KEY,
  "agentId" text NOT NULL,
  day date NOT NULL,
  "startMin" int NOT NULL,
  "endMin" int NOT NULL,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);
