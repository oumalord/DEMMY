param(
  [string]$PostgresBin = "C:\Program Files\PostgreSQL\17\bin",
  [string]$AdminUser = "postgres",
  [string]$Database = "rentflow",
  [string]$AppUser = "rentflow",
  [string]$AppPassword = "rentflow_dev_password",
  [string]$ProjectRoot = "C:\Users\Sir. Lord's\Documents\DEMMY"
)

$ErrorActionPreference = "Stop"
$psql = Join-Path $PostgresBin "psql.exe"

if (!(Test-Path $psql)) {
  throw "psql.exe was not found at $psql. Change -PostgresBin to your PostgreSQL bin folder."
}

Write-Host "Creating RentFlow PostgreSQL role and database..."
& $psql -U $AdminUser -d postgres -v ON_ERROR_STOP=1 -c "do `$`$ begin if not exists (select from pg_roles where rolname = '$AppUser') then create role $AppUser login password '$AppPassword'; end if; end `$`$;"
& $psql -U $AdminUser -d postgres -v ON_ERROR_STOP=1 -c "select 'create database $Database owner $AppUser' where not exists (select from pg_database where datname = '$Database')\gexec"

Write-Host "Installing schema..."
& $psql -U $AdminUser -d $Database -v ON_ERROR_STOP=1 -f "$ProjectRoot\database\schema.sql"

Write-Host "Installing demo seed data..."
& $psql -U $AdminUser -d $Database -v ON_ERROR_STOP=1 -f "$ProjectRoot\database\seed.sql"

Write-Host "Database ready:"
Write-Host "postgres://${AppUser}:${AppPassword}@localhost:5432/${Database}"
