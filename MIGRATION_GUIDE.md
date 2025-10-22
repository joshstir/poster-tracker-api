# Database Migration Guide

This guide explains how to set up and manage the database for the Movie Poster Tracking API.

## Initial Setup

### Prerequisites

- PostgreSQL 14 or higher installed (or Azure Database for PostgreSQL)
- Node.js and npm installed
- Prisma CLI (installed via npm dependencies)

### Step 1: Configure Database Connection

Create a `.env` file with your database connection string:

```bash
DATABASE_URL="postgresql://username:password@host:5432/database_name?schema=public"
```

For Azure Database for PostgreSQL:
```bash
DATABASE_URL="postgresql://username:password@server.postgres.database.azure.com:5432/database?schema=public&sslmode=require"
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema.

### Step 4: Create Database (if needed)

If using a local PostgreSQL instance and the database doesn't exist:

```sql
CREATE DATABASE poster_tracker;
```

### Step 5: Run Migrations

For development (creates migration files):
```bash
npm run prisma:migrate
```

For production (applies existing migrations):
```bash
npx prisma migrate deploy
```

### Step 6: Seed Predefined Tags

```bash
npm run prisma:seed
```

This will create the following predefined tags:
- Action
- Adventure
- Animation
- Comedy
- Crime
- Documentary
- Drama
- Fantasy
- Horror
- Mystery
- Romance
- Science Fiction
- Thriller
- Western
- Biography
- Musical
- War
- Historical
- Family
- Noir

## Making Schema Changes

### Step 1: Update Schema

Edit `prisma/schema.prisma` to make your changes.

Example - Adding a new field to Poster:
```prisma
model Poster {
  id          Int      @id @default(autoincrement())
  userId      String
  title       String
  year        Int
  imageUrl    String
  description String?  // New field
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // ... rest of model
}
```

### Step 2: Create Migration

```bash
npx prisma migrate dev --name add_description_to_poster
```

This will:
1. Generate SQL migration file
2. Apply migration to database
3. Regenerate Prisma Client

### Step 3: Update Application Code

Update TypeScript types and service methods to use the new field.

## Common Migration Tasks

### Adding a New Table

1. Add model to `schema.prisma`
2. Define relationships
3. Create migration: `npx prisma migrate dev --name add_new_table`

### Modifying a Column

1. Update field in `schema.prisma`
2. Create migration: `npx prisma migrate dev --name modify_column`

### Adding an Index

```prisma
model Poster {
  // ... fields

  @@index([title])
  @@index([year])
  @@index([userId, createdAt])
}
```

Create migration: `npx prisma migrate dev --name add_indexes`

### Renaming a Field

Prisma may interpret renaming as delete + create. To preserve data:

1. Create migration: `npx prisma migrate dev --create-only --name rename_field`
2. Edit generated SQL file to use `ALTER TABLE ... RENAME COLUMN`
3. Apply migration: `npx prisma migrate dev`

## Production Deployment

### Azure Database for PostgreSQL

1. Create database in Azure Portal or CLI
2. Configure firewall rules
3. Get connection string
4. Set `DATABASE_URL` environment variable
5. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
6. Seed database:
   ```bash
   npx prisma db seed
   ```

### Important Notes

- **Never** run `prisma migrate dev` in production
- Always use `prisma migrate deploy` for production
- Ensure all migrations are committed to git
- Test migrations on a staging database first

## Resetting the Database

### Development

To completely reset and reseed:

```bash
npx prisma migrate reset
```

This will:
1. Drop database
2. Create database
3. Run all migrations
4. Run seed script

### Production

**WARNING**: This will delete all data!

```bash
npx prisma migrate reset --force
```

## Troubleshooting

### Migration Conflicts

If migrations are out of sync:

```bash
# Check migration status
npx prisma migrate status

# Resolve conflicts
npx prisma migrate resolve --applied "migration_name"
```

### Connection Issues

**Error: P1001 - Can't reach database server**
- Check connection string
- Verify database is running
- Check firewall rules

**Error: P1003 - Database does not exist**
- Create database manually
- Verify database name in connection string

### Schema Drift

If schema differs from migrations:

```bash
# View differences
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma

# Fix by creating new migration
npx prisma migrate dev --name fix_schema_drift
```

## Prisma Studio

View and edit data using Prisma Studio:

```bash
npm run prisma:studio
```

This opens a web interface at http://localhost:5555

## Backup and Restore

### Backup

```bash
# PostgreSQL backup
pg_dump -h host -U username -d poster_tracker > backup.sql

# Azure PostgreSQL
az postgres flexible-server backup create \
  --resource-group poster-tracker-rg \
  --name poster-tracker-db \
  --backup-name manual-backup-$(date +%Y%m%d)
```

### Restore

```bash
# PostgreSQL restore
psql -h host -U username -d poster_tracker < backup.sql

# Azure PostgreSQL
az postgres flexible-server restore \
  --resource-group poster-tracker-rg \
  --name restored-server \
  --source-server poster-tracker-db \
  --restore-point-in-time "2024-01-20T12:00:00Z"
```

## Migration Best Practices

1. **Test Locally**: Always test migrations on local database first
2. **Use Descriptive Names**: Name migrations clearly (e.g., `add_poster_description`)
3. **One Change Per Migration**: Keep migrations focused and atomic
4. **Review Generated SQL**: Check migration files before applying
5. **Backup Before Migration**: Always backup production database
6. **Plan for Rollback**: Have a rollback strategy for each migration
7. **Version Control**: Commit all migration files to git
8. **Document Changes**: Add comments for complex migrations

## Schema Versioning

All migration files are stored in `prisma/migrations/` with timestamps:

```
prisma/migrations/
├── 20240120120000_init/
│   └── migration.sql
├── 20240120130000_add_description_to_poster/
│   └── migration.sql
└── migration_lock.toml
```

Never modify existing migration files. Always create new migrations for changes.

## Common Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Create migration (dev)
npx prisma migrate dev

# Apply migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset database (dev only)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate

# Pull schema from database
npx prisma db pull

# Push schema to database (prototype only)
npx prisma db push
```

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Azure Database for PostgreSQL](https://docs.microsoft.com/en-us/azure/postgresql/)
