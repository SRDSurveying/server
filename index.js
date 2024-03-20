const express = require('express')
const app = express()
const cors = require('cors')
const pool = require('./db')
const bcrypt = require('bcrypt')

app.use(cors())
app.use(express.json())

const userAccountForm = []

app.post('/register', async (req, res) => {
    try {
        const { e_username, e_fullname, e_password } = req.body;
        const hash = await bcrypt.hash(e_password, 10)
        const checkExistingUsername = await pool.query("SELECT e_username FROM accounts WHERE e_username=LOWER($1)", [e_username])
        if (checkExistingUsername.rows.length >= 1) {
            res.json({ result: 'Existing Username' })
        } else {

            const checkExistingFullName = await pool.query("SELECT e_fullname from accounts where e_fullname=LOWER($1)", [e_fullname])
            if (checkExistingFullName.rows.length >= 1) {
                res.json({ result: 'Existing Full Name' })
            } else {
                res.json({ result: 'Success' })
                await pool.query("INSERT INTO accounts(user_type, e_username, e_fullname, e_password) VALUES (0, LOWER($1), $2 , $3)", [e_username, e_fullname, hash]);
            }
        }

    } catch (error) {
        console.error(error.message);
    }
})

app.post('/login', async (req, res) => {
    try {
        const { e_username, e_password } = req.body;

        const checkUserPass = await pool.query("SELECT e_id, e_username, e_password, e_fullname, user_type FROM accounts WHERE e_username=LOWER($1)", [e_username]);

        if (checkUserPass.rows.length > 0) {
            const userDataForm = {
                e_id: checkUserPass.rows[0].e_id,
                e_username: checkUserPass.rows[0].e_username,
                e_fullname: checkUserPass.rows[0].e_fullname,
                user_type: checkUserPass.rows[0].user_type
            };

            const isValid = await bcrypt.compare(e_password, checkUserPass.rows[0].e_password);

            if (isValid) {
                res.json(userDataForm);
                console.log(userDataForm);
            } else {
                res.status(401).json({ success: false });
            }
        } else {
            res.status(404).json({ success: false });
        }

    } catch (error) {
        console.error(error.message);
    }
})

app.get('/loadLeaves/:e_id', async (req, res) => {
    try {
        const { e_id } = req.params;
        const loadLeaves = await pool.query("SELECT * FROM leaves WHERE e_id=$1", [e_id]);

        if (loadLeaves.rows) {
            res.json(loadLeaves.rows)
        } else {
            res.status(404)
        }
    } catch (error) {
        console.error(error.message)
    }
})

app.get('/loadAllLeaves', async (req, res) => {
    try {
        const loadLeaves = await pool.query("SELECT a.e_id, a.request_date, b.e_fullname, a.leave_type, a.leave_date, a.no_days, a.reason, a.half_day_count FROM leaves a JOIN accounts b ON a.e_id = b.e_id;");

        
        if (loadLeaves.rows) {
            res.json(loadLeaves.rows)
            console.log(loadLeaves)
        } else {
            res.status(404)
        }
    } catch (error) {
        console.error(error.message)
    }
})

app.get('/loadLeaveRequests', async (req, res) => {
    try {
        const loadLeaves = await pool.query("SELECT a.e_id, a.request_date, a.req_id, b.e_fullname, a.leave_type, a.leave_date, a.no_days, a.reason FROM leaveRequests a JOIN accounts b ON a.e_id = b.e_id;");

        if (loadLeaves.rows) {
            res.json(loadLeaves.rows)
        } else {
            res.status(404)
        }
    } catch (error) {
        console.error(error.message)
    }
})

app.delete('/leaveRequestReject/:req_id', async (req, res) => {
    try {
        const { req_id } = req.params;
        const deleteRequest = await pool.query("DELETE FROM leaveRequests WHERE req_id = $1", [req_id])
        res.json("The Entry was rejected")
        res.json(deleteRequest)
    } catch (error) {
        console.error(error.message)
    }
})

app.delete('/leaveRequestApprove/:req_id', async (req, res) => {
    try {
        const { req_id } = req.params;
        const approveRequest = await pool.query("SELECT e_id, leave_type, leave_date, no_days, reason, half_day_count, request_date FROM leaveRequests WHERE req_id = $1", [req_id])

        const {
            e_id,
            leave_type,
            leave_date,
            no_days,
            reason,
            half_day_count,
            request_date,
        } = approveRequest.rows[0];

        // Insert approved leave request into the 'leaves' table
        await pool.query(
            "INSERT INTO leaves(e_id, leave_type, leave_date, half_day_count, no_days, reason, request_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [e_id, leave_type, leave_date, half_day_count, no_days, reason, request_date]
        );

        // Delete the leave request from the 'leaveRequests' table
        await pool.query("DELETE FROM leaveRequests WHERE req_id = $1", [req_id]);

    } catch (error) {
        console.error(error.message)
    }
})

app.get('/loadUsers', async (req, res) => {
    try {
        const loadUsers = await pool.query("SELECT e_fullname FROM accounts");

        if (loadUsers.rows) {
            res.json(loadUsers.rows)
        } else {
            res.status(404)
        }
    } catch (error) {
        console.error(error.message)
    }
})

app.post('/addLeave', async (req, res) => {
    try {
        const { leaveType, selectedFullName, selectedDates, halfDayCount, dateLength, leaveReason, fullDate } = req.body;

        // Get the employee ID for the selected full name
        const findId = await pool.query('SELECT e_id FROM accounts WHERE e_fullname = $1', [selectedFullName]);
        console.log(selectedFullName)
        if (findId.rows.length > 0) {
            const e_id = findId.rows[0].e_id;

            // Loop through selected dates and insert each date into the database
            for (const date of selectedDates) {
                await pool.query(
                    "INSERT INTO leaves(e_id, leave_type, leave_date, half_day_count, no_days, reason, request_date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [e_id, leaveType, date, halfDayCount, dateLength, leaveReason, fullDate]
                );
            }

            res.status(200).json({ success: true, message: 'Leave added successfully' });
        } else {
            res.status(404).json({ success: false, message: 'Employee not found' });
        }
    } catch (error) {
        console.error(error.message);

        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.get('/getLeaveCount/:e_fullname', async (req, res) => {
    try {
        const { e_fullname } = req.params; // Retrieve e_fullname from request params
        const getID = await pool.query("SELECT e_id FROM accounts WHERE e_fullname = $1", [e_fullname]);

        if (getID.rows.length > 0) {
            const leaveCounts = await pool.query("SELECT SUM(no_days) AS total_leave_days FROM leaves WHERE e_id = $1", [getID.rows[0].e_id]);
            const totalLeaveDays = leaveCounts.rows[0].total_leave_days || 0;
            res.json({ totalLeaveDays });
        } else {
            res.json({ totalLeaveDays: 0 });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//FOR PRODUCTION: change 5000 to "process.env.PORT"
app.listen(5000, () => {
    console.log('server runs')
})