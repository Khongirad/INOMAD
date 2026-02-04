const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📖 Reading migration SQL file...');
    const sqlPath = path.join(__dirname, 'prisma', 'manual_migration_state_archive_bank.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('🔄 Parsing SQL statements...');
    
    // Split SQL into individual statements
    // Handle multi-line statements and comments
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0) // Remove comments and empty lines
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('/*')); // Remove empty and comment blocks
    
    console.log(`   Found ${statements.length} SQL statements\n`);
    console.log('🔄 Applying migration to database...');
    console.log('   This may take a few moments...\n');
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      
      // Skip comment blocks
      if (stmt.startsWith('/*') || stmt.includes('Warnings:') || stmt.includes('PHASE')) {
        continue;
      }
      
      try {
        await prisma.$executeRawUnsafe(stmt + ';');
        successCount++;
        
        // Show progress every 10 statements
        if (successCount % 10 === 0) {
          console.log(`   ✓ Executed ${successCount} statements...`);
        }
      } catch (error) {
        // Some statements might fail because they already exist (idempotent)
        if (error.message.includes('already exists') || 
            error.message.includes('does not exist') ||
            error.message.includes('duplicate')) {
          skipCount++;
        } else {
          console.error(`\n⚠️  Statement ${i + 1} failed:`);
          console.error(`   ${stmt.substring(0, 100)}...`);
          console.error(`   Error: ${error.message}\n`);
          // Continue with other statements
        }
      }
    }
    
    console.log(`\n✅ Migration completed!`);
    console.log(`   - Successfully executed: ${successCount} statements`);
    console.log(`   - Skipped (already exists): ${skipCount} statements\n`);
    
    console.log('📋 Next steps:');
    console.log('   1. Mark migration as applied:');
    console.log('      npx prisma migrate resolve --applied "20260204064054_add_state_archive_and_bank_system"');
    console.log('   2. Regenerate Prisma Client:');
    console.log('      npx prisma generate');
    console.log('   3. Seed templates:');
    console.log('      curl -X POST http://localhost:3001/archive/templates/seed');
    
  } catch (error) {
    console.error('❌ Migration failed!');
    console.error('\nError details:');
    console.error(error);
    console.error('\n💡 Troubleshooting:');
    console.error('   - Check if database is running (localhost:5432)');
    console.error('   - Verify DATABASE_URL in .env file');
    console.error('   - Review error message above for SQL syntax issues');
    console.error('   - See MIGRATION_INSTRUCTIONS.md for alternative methods');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

