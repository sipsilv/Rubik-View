CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR,
        hashed_password VARCHAR,
        is_active BOOLEAN,
        full_name VARCHAR,
        role VARCHAR,
        phone_number VARCHAR,
        age INTEGER,
        address_line1 VARCHAR,
        address_line2 VARCHAR,
        city VARCHAR, state VARCHAR, 
        postal_code VARCHAR, country VARCHAR, 
        telegram_chat_id VARCHAR, 
        created_at DATETIME, 
        updated_at DATETIME, 
        userid VARCHAR, 
        last_activity TIMESTAMP);

        
INSERT INTO users VALUES(1,'jallusandeep@rubikview.com','$2b$12$Egfhgoq66biaphDQEqBGuOp78hgalMQ8OL.dCFpFIlbun0TBvIrOe',1,'Rubikview Super Admin','superadmin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-04 09:25:06.478748','RVCK5I94W4','2025-12-04 09:25:06.478126');
INSERT INTO users VALUES(3,'jallusanthosh@rubikview.com','$2b$12$R52yQ3FA.U5Ixqs/VBBfGey52tpbYCC3GeIFTKPQ.gdSQ8Y3jm4Qe',1,'santhosh','user',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-02 04:57:13.508559','2025-12-04 06:59:54.902352','RVUAOX09YN',NULL);
INSERT INTO users VALUES(6,'jallu@rubikview.com','$2b$12$hO5cOkRrZuNYzSkMer7ju.D0JBnUv5f7ic2aWs3fyx11rrt2tomo6',1,NULL,'user',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-04 06:58:01.003348','2025-12-04 07:30:08.333575','USR3477','2025-12-04 07:30:08.332758');