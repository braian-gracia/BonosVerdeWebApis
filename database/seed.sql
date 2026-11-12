USE bonos_db;

INSERT IGNORE INTO users
  (email, name, password_hash, role, curv_code, total_spent)
VALUES
  (
    'admin@bonosverde.com',
    'Administrador',
    '$2b$12$FjBwOxkIXx0HsAxl.2RHsujY.saWBcIaRYqI7pL0vLNsXsjXuTcy2',
    'ADMIN',
    'CURV-ADM1-0001',
    5000.00
  ),
  (
    'inversor@bonosverde.com',
    'Carlos Inversor',
    '$2b$12$tKV7HyXtGkhfP4rlv3YnA.uJL03xoHJoLXQ0JI.WiAZxwNb5ZK4Aq',
    'INVESTOR',
    'CURV-INV1-0001',
    300.00
  ),
  (
    'premium@bonosverde.com',
    'María Premium',
    '$2b$12$tKV7HyXtGkhfP4rlv3YnA.uJL03xoHJoLXQ0JI.WiAZxwNb5ZK4Aq',
    'PREMIUM',
    'CURV-PRM1-0001',
    1500.00
  );
