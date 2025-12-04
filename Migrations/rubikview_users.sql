PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR,
        hashed_password VARCHAR,
        is_active BOOLEAN,
        full_name VARCHAR,
        role VARCHAR
    , phone_number VARCHAR, age INTEGER, address_line1 VARCHAR, address_line2 VARCHAR, city VARCHAR, state VARCHAR, postal_code VARCHAR, country VARCHAR, telegram_chat_id VARCHAR, created_at DATETIME, updated_at DATETIME, userid VARCHAR, last_activity TIMESTAMP);
INSERT INTO users VALUES(1,'jallusandeep@rubikview.com','$2b$12$Egfhgoq66biaphDQEqBGuOp78hgalMQ8OL.dCFpFIlbun0TBvIrOe',1,'Rubikview Super Admin','superadmin',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-04 09:25:06.478748','RVCK5I94W4','2025-12-04 09:25:06.478126');
INSERT INTO users VALUES(3,'jallusanthosh@rubikview.com','$2b$12$R52yQ3FA.U5Ixqs/VBBfGey52tpbYCC3GeIFTKPQ.gdSQ8Y3jm4Qe',1,'santhosh','user',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-02 04:57:13.508559','2025-12-04 06:59:54.902352','RVUAOX09YN',NULL);
INSERT INTO users VALUES(6,'jallu@rubikview.com','$2b$12$hO5cOkRrZuNYzSkMer7ju.D0JBnUv5f7ic2aWs3fyx11rrt2tomo6',1,NULL,'user',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2025-12-04 06:58:01.003348','2025-12-04 07:30:08.333575','USR3477','2025-12-04 07:30:08.332758');
CREATE TABLE otp_tokens (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	purpose VARCHAR NOT NULL, 
	code_hash VARCHAR NOT NULL, 
	expires_at DATETIME NOT NULL, 
	is_used BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE change_requests (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	request_type VARCHAR NOT NULL, 
	status VARCHAR, 
	details VARCHAR, 
	created_at DATETIME, 
	resolved_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE admin_jobs (
	id INTEGER NOT NULL, 
	job_type VARCHAR NOT NULL, 
	status VARCHAR, 
	triggered_by VARCHAR, 
	log_path VARCHAR, 
	details VARCHAR, 
	started_at DATETIME, 
	finished_at DATETIME, 
	PRIMARY KEY (id)
);
INSERT INTO admin_jobs VALUES(1,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201183808.log',NULL,'2025-12-01 18:38:08.420721',NULL);
INSERT INTO admin_jobs VALUES(2,'ohlcv_load','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201184045.log','{"pid": 27152, "returncode": 1}','2025-12-01 18:40:45.851611','2025-12-01 18:42:23.629148');
INSERT INTO admin_jobs VALUES(3,'signal_process','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201184139.log',NULL,'2025-12-01 18:41:39.607336','2025-12-01 18:44:49.543282');
INSERT INTO admin_jobs VALUES(4,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201184907.log','{"pid": 41072, "forced_stop": true}','2025-12-01 18:49:07.387728','2025-12-01 18:49:27.868647');
INSERT INTO admin_jobs VALUES(5,'signal_process','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201184929.log','{"pid": 26892, "returncode": 1}','2025-12-01 18:49:29.398418','2025-12-01 18:49:32.057881');
INSERT INTO admin_jobs VALUES(6,'signal_process','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201184944.log','{"pid": 16924, "returncode": 1}','2025-12-01 18:49:44.013620','2025-12-01 18:49:46.737489');
INSERT INTO admin_jobs VALUES(7,'ohlcv_load','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201184955.log','{"pid": 18380, "returncode": 1}','2025-12-01 18:49:55.845521','2025-12-01 18:49:57.635938');
INSERT INTO admin_jobs VALUES(8,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201184958.log','{"pid": 13560, "forced_stop": true}','2025-12-01 18:49:58.489698','2025-12-01 18:49:59.324372');
INSERT INTO admin_jobs VALUES(9,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201185000.log','{"pid": 39976, "forced_stop": true}','2025-12-01 18:50:00.050847','2025-12-01 18:50:00.856418');
INSERT INTO admin_jobs VALUES(10,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201185044.log','{"pid": 6272, "forced_stop": true}','2025-12-01 18:50:44.808106','2025-12-01 18:50:47.920789');
INSERT INTO admin_jobs VALUES(11,'ohlcv_load','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201185210.log','{"pid": 23740, "returncode": 1}','2025-12-01 18:52:10.382994','2025-12-01 18:52:16.069847');
INSERT INTO admin_jobs VALUES(12,'signal_process','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201185220.log','{"pid": 6244, "returncode": 1}','2025-12-01 18:52:20.990642','2025-12-01 18:52:24.733373');
INSERT INTO admin_jobs VALUES(13,'ohlcv_load','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201185427.log','{"pid": 40012, "returncode": 1}','2025-12-01 18:54:27.971102','2025-12-01 18:54:32.225026');
INSERT INTO admin_jobs VALUES(14,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201185521.log','{"forced_stop": true}','2025-12-01 18:55:21.394385','2025-12-01 18:56:04.767184');
INSERT INTO admin_jobs VALUES(15,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201185606.log','{"pid": 20628, "forced_stop": true}','2025-12-01 18:56:06.936151','2025-12-01 18:56:34.104475');
INSERT INTO admin_jobs VALUES(16,'ohlcv_load','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201190103.log','{"pid": 39700, "returncode": 1}','2025-12-01 19:01:03.047224','2025-12-01 19:01:12.061425');
INSERT INTO admin_jobs VALUES(17,'signal_process','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201190114.log','{"pid": 22916, "returncode": 1}','2025-12-01 19:01:14.843376','2025-12-01 19:01:17.114292');
INSERT INTO admin_jobs VALUES(18,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201190220.log','{"forced_stop": true}','2025-12-01 19:02:20.210352','2025-12-01 19:04:34.774754');
INSERT INTO admin_jobs VALUES(19,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201190442.log','{"forced_stop": true}','2025-12-01 19:04:42.971018','2025-12-01 19:05:31.289249');
INSERT INTO admin_jobs VALUES(20,'ohlcv_load','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201190549.log','{"pid": 29220, "returncode": 1}','2025-12-01 19:05:49.710099','2025-12-01 19:05:56.726918');
INSERT INTO admin_jobs VALUES(21,'ohlcv_load','completed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201190705.log','{"pid": 18164, "returncode": 0}','2025-12-01 19:07:05.456314','2025-12-01 19:07:11.730256');
INSERT INTO admin_jobs VALUES(22,'signal_process','failed','auto','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201190711.log','{"pid": 36284, "returncode": 1}','2025-12-01 19:07:11.744835','2025-12-01 19:07:21.453553');
INSERT INTO admin_jobs VALUES(23,'signal_process','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201190802.log','{"pid": 25740, "returncode": 1}','2025-12-01 19:08:02.351113','2025-12-01 19:08:12.766430');
INSERT INTO admin_jobs VALUES(24,'signal_process','failed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201190838.log','{"pid": 29648, "returncode": 1}','2025-12-01 19:08:38.813601','2025-12-01 19:08:49.888738');
INSERT INTO admin_jobs VALUES(25,'ohlcv_load','completed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201190856.log','{"pid": 19432, "returncode": 0}','2025-12-01 19:08:56.535638','2025-12-01 19:09:02.337841');
INSERT INTO admin_jobs VALUES(26,'signal_process','failed','auto','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201190902.log','{"pid": 37636, "returncode": 1}','2025-12-01 19:09:02.363961','2025-12-01 19:09:12.540622');
INSERT INTO admin_jobs VALUES(27,'ohlcv_load','completed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201190917.log','{"pid": 19612, "returncode": 0}','2025-12-01 19:09:17.505262','2025-12-01 19:09:23.119571');
INSERT INTO admin_jobs VALUES(28,'signal_process','failed','auto','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201190923.log','{"pid": 12392, "returncode": 1}','2025-12-01 19:09:23.130708','2025-12-01 19:09:34.772864');
INSERT INTO admin_jobs VALUES(29,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201191233.log','{"pid": 21600, "forced_stop": true}','2025-12-01 19:12:33.451035','2025-12-01 19:13:00.380372');
INSERT INTO admin_jobs VALUES(30,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201191726.log','{"pid": 1792, "stopped": true, "returncode": 1}','2025-12-01 19:17:26.465887','2025-12-01 19:18:10.329515');
INSERT INTO admin_jobs VALUES(31,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201191811.log','{"pid": 41416, "stopped": true, "returncode": 0}','2025-12-01 19:18:11.449894','2025-12-01 19:21:10.310436');
INSERT INTO admin_jobs VALUES(32,'ohlcv_load','completed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201192113.log','{"pid": 38252, "returncode": 0}','2025-12-01 19:21:13.855641','2025-12-01 19:24:38.602020');
INSERT INTO admin_jobs VALUES(33,'signal_process','completed','auto','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201192438.log','{"pid": 23056, "returncode": 0}','2025-12-01 19:24:38.613945','2025-12-01 19:26:06.665717');
INSERT INTO admin_jobs VALUES(34,'ohlcv_load','stopped','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251201200851.log','{"pid": 40820, "forced_stop": true}','2025-12-01 20:08:51.118736','2025-12-01 20:12:44.974483');
INSERT INTO admin_jobs VALUES(35,'signal_process','completed','auto','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201201454.log','{"pid": 21940, "returncode": 0}','2025-12-01 20:14:54.563616','2025-12-01 20:16:01.448102');
INSERT INTO admin_jobs VALUES(36,'signal_process','completed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251201205946.log','{"pid": 35984, "returncode": 0}','2025-12-01 20:59:46.314660','2025-12-01 21:00:19.890604');
INSERT INTO admin_jobs VALUES(37,'ohlcv_load','completed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251202041405.log','{"pid": 26220, "returncode": 0}','2025-12-02 04:14:05.503047','2025-12-02 04:25:20.277063');
INSERT INTO admin_jobs VALUES(38,'signal_process','completed','auto','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251202042520.log','{"pid": 39732, "returncode": 0}','2025-12-02 04:25:20.285643','2025-12-02 04:25:52.836778');
INSERT INTO admin_jobs VALUES(39,'ohlcv_load','completed','manual','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\ohlcv_load_20251202204253.log','{"pid": 37788, "returncode": 0}','2025-12-02 20:42:53.504331','2025-12-02 20:49:14.582695');
INSERT INTO admin_jobs VALUES(40,'signal_process','completed','auto','C:\Users\jallu\OneDrive\pgp\Python\Stock predictor\Rubik_view\logs\signal_process_20251202204914.log','{"pid": 19896, "returncode": 0}','2025-12-02 20:49:14.595550','2025-12-02 20:50:37.947613');
INSERT INTO admin_jobs VALUES(41,'ohlcv_load','completed','manual','DB','{"pid": 9668, "returncode": 0}','2025-12-03 04:06:14.253300','2025-12-03 04:51:18.836637');
INSERT INTO admin_jobs VALUES(42,'signal_process','completed','auto','DB','{"pid": 35284, "returncode": 0}','2025-12-03 04:51:18.856168','2025-12-03 04:54:05.618580');
INSERT INTO admin_jobs VALUES(43,'ohlcv_load','stopped','manual','DB','{"pid": 22804, "stopped": true, "returncode": 1}','2025-12-03 06:04:55.203277','2025-12-03 06:04:58.863290');
INSERT INTO admin_jobs VALUES(44,'ohlcv_load','failed','manual','DB','{"pid": 43724, "returncode": 1}','2025-12-03 19:39:59.531336','2025-12-03 19:40:03.521989');
INSERT INTO admin_jobs VALUES(45,'ohlcv_load','failed','manual','DB','{"pid": 18588, "returncode": 1}','2025-12-03 19:40:12.794724','2025-12-03 19:40:16.503263');
INSERT INTO admin_jobs VALUES(46,'ohlcv_load','failed','manual','DB','{"pid": 4588, "returncode": 1}','2025-12-03 19:49:59.249353','2025-12-03 19:50:08.487262');
INSERT INTO admin_jobs VALUES(47,'signal_process','stopped','manual','DB','{"pid": 20324, "stopped": true, "returncode": 1}','2025-12-03 19:50:10.374793','2025-12-03 19:50:19.759893');
INSERT INTO admin_jobs VALUES(48,'ohlcv_load','failed','manual','DB','{"pid": 19612, "returncode": 1}','2025-12-03 19:50:21.648312','2025-12-03 19:50:32.446891');
INSERT INTO admin_jobs VALUES(49,'ohlcv_load','failed','manual','DB','{"pid": 3868, "returncode": 1}','2025-12-03 19:56:17.395126','2025-12-03 19:56:18.386888');
INSERT INTO admin_jobs VALUES(50,'ohlcv_load','failed','manual','DB','{"pid": 1748, "returncode": 1}','2025-12-03 19:56:19.575536','2025-12-03 19:56:29.961825');
INSERT INTO admin_jobs VALUES(51,'ohlcv_load','failed','manual','DB','{"pid": 28744, "returncode": 1}','2025-12-03 19:59:43.040649','2025-12-03 19:59:50.186146');
INSERT INTO admin_jobs VALUES(52,'ohlcv_load','failed','manual','DB','{"pid": 37884, "returncode": 1}','2025-12-03 19:59:53.440446','2025-12-03 20:00:09.614421');
INSERT INTO admin_jobs VALUES(53,'ohlcv_load','stopped','manual','DB','{"pid": 22308, "stopped": true, "returncode": 1}','2025-12-03 20:02:15.805774','2025-12-03 20:02:19.175044');
INSERT INTO admin_jobs VALUES(54,'ohlcv_load','stopped','manual','DB','{"pid": 14256, "stopped": true, "returncode": 1}','2025-12-03 20:02:20.589792','2025-12-03 20:04:46.195990');
INSERT INTO admin_jobs VALUES(55,'ohlcv_load','stopped','manual','DB','{"pid": 6380, "stopped": true, "returncode": 1}','2025-12-04 05:17:32.509815','2025-12-04 05:17:57.920109');
INSERT INTO admin_jobs VALUES(56,'signal_process','failed','manual','DB','{"pid": 13116, "returncode": 1}','2025-12-04 05:17:58.827208','2025-12-04 05:18:02.194764');
INSERT INTO admin_jobs VALUES(57,'signal_process','failed','manual','DB','{"pid": 16824, "returncode": 1}','2025-12-04 05:18:04.723679','2025-12-04 05:18:07.023075');
INSERT INTO admin_jobs VALUES(58,'signal_process','failed','manual','DB','{"pid": 26908, "returncode": 1}','2025-12-04 05:19:48.393418','2025-12-04 05:19:50.530226');
INSERT INTO admin_jobs VALUES(59,'signal_process','failed','manual','DB','{"pid": 6180, "returncode": 1}','2025-12-04 05:27:49.955115','2025-12-04 05:27:52.016823');
INSERT INTO admin_jobs VALUES(60,'signal_process','stopped','manual','DB','{"pid": 28340, "stopped": true, "returncode": 1}','2025-12-04 05:29:32.353559','2025-12-04 05:29:39.115308');
CREATE TABLE indicator_configs (
	id INTEGER NOT NULL, 
	indicator_name VARCHAR NOT NULL, 
	active BOOLEAN, 
	parameter_1 INTEGER, 
	parameter_2 INTEGER, 
	parameter_3 INTEGER, 
	manual_weight VARCHAR, 
	use_ai_weight BOOLEAN, 
	ai_latest_weight VARCHAR, 
	created_at DATETIME, 
	updated_at DATETIME, description VARCHAR, 
	PRIMARY KEY (id)
);
INSERT INTO indicator_configs VALUES(1,'RSI',1,14,NULL,NULL,'1.2',1,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(2,'MFI',1,14,NULL,NULL,'0.8',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(3,'StochRSI',1,14,3,3,'1.0',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(4,'CCI',1,20,NULL,NULL,'0.7',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(5,'ROC',1,10,NULL,NULL,'0.8',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(6,'Williams %R',1,14,NULL,NULL,'0.8',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(7,'MACD',1,12,26,9,'1.5',1,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(8,'ADX',1,14,NULL,NULL,'1.0',1,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(9,'EMA Crossover',1,9,21,NULL,'1.3',1,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(10,'SuperTrend',1,10,3,NULL,'1.4',1,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(11,'VWAP',1,NULL,NULL,NULL,'1.0',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(12,'Parabolic SAR',1,0,0,NULL,'1.1',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(13,'Ichimoku Cloud',1,9,26,52,'1.5',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(14,'Bollinger Bands',1,20,2,NULL,'0.9',1,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(15,'ATR',1,14,NULL,NULL,'1.0',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(16,'Donchian Channels',1,20,NULL,NULL,'0.9',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(17,'Keltner Channel',1,20,2,NULL,'1.0',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(18,'OBV',1,NULL,NULL,NULL,'1.0',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(19,'VMA',1,20,NULL,NULL,'1.0',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
INSERT INTO indicator_configs VALUES(20,'ADL',1,NULL,NULL,NULL,'1.0',0,NULL,NULL,'2025-12-01 05:53:42',NULL);
CREATE TABLE user_feedback (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	feedback_type VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	description VARCHAR, 
	status VARCHAR, 
	admin_notes VARCHAR, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE TABLE job_schedules (
	id INTEGER NOT NULL, 
	job_type VARCHAR NOT NULL, 
	schedule_type VARCHAR NOT NULL, 
	schedule_value VARCHAR NOT NULL, 
	is_active BOOLEAN, 
	next_run_at DATETIME, 
	last_run_at DATETIME, 
	created_at DATETIME, 
	updated_at DATETIME, 
	created_by INTEGER, 
	PRIMARY KEY (id), 
	FOREIGN KEY(created_by) REFERENCES users (id)
);
CREATE TABLE pending_user_requests (
	id INTEGER NOT NULL, 
	userid VARCHAR NOT NULL, 
	full_name VARCHAR, 
	email VARCHAR, 
	phone_number VARCHAR, 
	age INTEGER, 
	address_line1 VARCHAR, 
	address_line2 VARCHAR, 
	city VARCHAR, 
	state VARCHAR, 
	postal_code VARCHAR, 
	country VARCHAR, 
	telegram_chat_id VARCHAR, 
	message VARCHAR, 
	status VARCHAR, 
	created_at DATETIME, 
	updated_at DATETIME, user_id INTEGER, resolved_at TIMESTAMP, 
	PRIMARY KEY (id)
);
INSERT INTO pending_user_requests VALUES(1,'RVEF894QAZ','sandy123','','123456789',NULL,'','','hyd','','','',NULL,'','pending','2025-12-04 06:36:09.722864','2025-12-04 06:36:09.722876',NULL,NULL);
INSERT INTO pending_user_requests VALUES(2,'RVZKHTQGFO','sandy123','','123456789',NULL,'','','hyd','','','',NULL,'','pending','2025-12-04 06:36:11.656885','2025-12-04 06:36:11.657066',NULL,NULL);
INSERT INTO pending_user_requests VALUES(3,'SAN0019','sande123','jallu@gmail.com','',NULL,'','','','','','',NULL,'','pending','2025-12-04 06:47:18.371025','2025-12-04 06:47:18.371036',NULL,NULL);
INSERT INTO pending_user_requests VALUES(4,'SAN6789','sandeep','jallu@gamil.com','123456789',39,'','','','','','',NULL,'','pending','2025-12-04 07:00:47.427777','2025-12-04 07:00:47.427797',NULL,NULL);
CREATE TABLE logincredentials (
	id INTEGER NOT NULL, 
	userid VARCHAR NOT NULL, 
	hashed_password VARCHAR NOT NULL, 
	is_active BOOLEAN, 
	role VARCHAR, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE TABLE userrequests (
	id INTEGER NOT NULL, 
	userid VARCHAR NOT NULL, 
	full_name VARCHAR NOT NULL, 
	email VARCHAR NOT NULL, 
	phone_number VARCHAR NOT NULL, 
	age INTEGER NOT NULL, 
	address_line1 VARCHAR, 
	address_line2 VARCHAR, 
	city VARCHAR, 
	state VARCHAR, 
	postal_code VARCHAR, 
	country VARCHAR, 
	message VARCHAR, 
	status VARCHAR, 
	resolved_at DATETIME, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE TABLE userdetails (
	id INTEGER NOT NULL, 
	userid VARCHAR NOT NULL, 
	email VARCHAR NOT NULL, 
	full_name VARCHAR, 
	phone_number VARCHAR, 
	age INTEGER, 
	address_line1 VARCHAR, 
	address_line2 VARCHAR, 
	city VARCHAR, 
	state VARCHAR, 
	postal_code VARCHAR, 
	country VARCHAR, 
	last_activity DATETIME, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(userid) REFERENCES logincredentials (userid) ON DELETE CASCADE
);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('users',6);
CREATE INDEX ix_otp_tokens_id ON otp_tokens (id);
CREATE INDEX ix_change_requests_id ON change_requests (id);
CREATE INDEX ix_admin_jobs_id ON admin_jobs (id);
CREATE INDEX ix_indicator_configs_id ON indicator_configs (id);
CREATE INDEX ix_user_feedback_id ON user_feedback (id);
CREATE INDEX ix_job_schedules_id ON job_schedules (id);
CREATE INDEX ix_pending_user_requests_id ON pending_user_requests (id);
CREATE UNIQUE INDEX ix_pending_user_requests_userid ON pending_user_requests (userid);
CREATE INDEX ix_logincredentials_id ON logincredentials (id);
CREATE UNIQUE INDEX ix_logincredentials_userid ON logincredentials (userid);
CREATE UNIQUE INDEX ix_userrequests_userid ON userrequests (userid);
CREATE INDEX ix_userrequests_id ON userrequests (id);
CREATE UNIQUE INDEX ix_userdetails_userid ON userdetails (userid);
CREATE INDEX ix_userdetails_id ON userdetails (id);
CREATE UNIQUE INDEX ix_userdetails_email ON userdetails (email);
COMMIT;
