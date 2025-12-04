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

