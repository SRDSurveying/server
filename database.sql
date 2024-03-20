CREATE DATABASE SRDDatabase

CREATE TABLE leaves(
    leave_id SERIAL PRIMARY KEY,
    date_leave DATE,
	leave_type VARCHAR(2),
	no_days INT,
	e_id INT REFERENCES accounts(e_id)
);

CREATE TABLE accounts(
    e_id SERIAL PRIMARY KEY,
    user_type INT,
	e_username VARCHAR(64),
	e_fullname VARCHAR(64),
	e_password VARCHAR(64)
);

CREATE TABLE leaveRequests(
	req_id SERIAL PRIMARY KEY,
     e_id INT,
     leave_type VARCHAR(2),
	leave_date DATE[],
	no_days INT,
	reason VARCHAR(264)
);