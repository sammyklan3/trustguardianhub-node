const dotenv = require('dotenv');
const getTimestamp = require("../utils/utils.timestamp");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");
const { pool } = require("../config/db");
const ngrok = require("ngrok");
dotenv.config();
const fetch = require("node-fetch");


// @desc initiate stk push
// @method POST
// @route /stkPush
// @access public
const initiateSTKPush = async (req, res) => {
    try {
        const { amount, phone, userId, paymentPurpose } = req.body;

        if (!amount || !phone || !userId || !paymentPurpose) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        // Generate payment id
        const payment_id = generateRandomAlphanumericId(10);
        const payment_type = "MPESA";
        const status = "PENDING";

        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
        const auth = `Bearer ${req.safaricom_access_token}`;
        const timestamp = getTimestamp();

        //shortcode + passkey + timestamp
        const password = Buffer.from(process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp).toString("base64");

        // create callback url

        let callback_url;

        if (process.env.NODE_ENV === "development") {
            // callback_url = await ngrok.connect(process.env.PORT);
            // const api = ngrok.getApi();
            // await api.listTunnels();

            callback_url = "https://6337-2c0f-fe38-2185-310c-a8e7-6ec5-fdb1-584.ngrok-free.app";

        } else {
            const host = req.get("host");
            const protocol = req.protocol;
            callback_url = `${protocol}://${host}/api/stkPushCallback/${payment_id}`;
        }


        const headers = {
            "Authorization": auth,
            "Content-Type": "application/json"
        }

        const body = JSON.stringify(
            {
                "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone,
                "PartyB": process.env.BUSINESS_SHORT_CODE,
                "PhoneNumber": phone,
                "CallBackURL": process.env.NODE_ENV === "development" ? `${callback_url}/api/stkPushCallback/${payment_id}` : callback_url,
                "AccountReference": "TrustGuardianHub",
                "TransactionDesc": "A test transaction"
            }
        );

        const response = await fetch(url, {
            method: "POST",
            body: body,
            headers: headers
        });

        console.log(`Payment successfully initiated to ${phone}`);

        const query = "INSERT INTO payments (payment_id, payment_type, user_id, phone_number, payment_purpose, status, amount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *";
        const values = [payment_id, payment_type, userId, phone, paymentPurpose, status, amount];

        // Execute SQL query
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return result.status(400).json({ success: false, error: "An error occurred with the database" });
        }

        const responseBody = await response.json();
        res.status(response.status).json({ mpesaRes: responseBody, success: true, message: "Payment initiated successfully.", payment_id: payment_id });
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, error: "Failed to initiate payment" });
    }
};


const stkPushCallback = async (req, res) => {
    try {
        const { paymentId } = req.params;

        if (!paymentId) {
            return res.status(400).json({ success: false, error: "Payment ID is required" });
        };

        const callbackData = req.body;

        console.log(callbackData);

        if (!callbackData) {
            return res.status(400).json({ success: false, error: "No data received" });
        }

        // Check the result code
        const result_code = callbackData.Body.stkCallback.ResultCode;
        if (result_code !== 0) {
            // If the result code is not 0, there was an error
            const error_message = callbackData.Body.stkCallback.ResultDesc;
            const response_data = { ResultCode: result_code, ResultDesc: error_message };

            const deleteQuery = "DELETE FROM payments WHERE payment_id = $1 RETURNING *";
            const deleteValues = [paymentId];

            const deleteResult = await pool.query(deleteQuery, deleteValues);

            if (deleteResult.rows.length === 0) {
                return res.status(400).json({ success: false, error: "This payment does not exist" });
            }

            return res.status(400).json(response_data);
        }

        // If the result code is 0, the transaction was completed
        const body = req.body.Body.stkCallback.CallbackMetadata;

        // Get Mpesa code
        const codeObj = body.Item.find(obj => obj.Name === 'MpesaReceiptNumber');
        const mpesaCode = codeObj.Value;

        // Update payment status
        const updateQuery = "UPDATE payments SET status = $1, mpesa_receipt_number = $2 WHERE payment_id = $3 RETURNING *";
        const updateValues = ["CONFIRMED", mpesaCode, paymentId];

        const updateResult = await pool.query(updateQuery, updateValues);

        if (updateResult.rows.length === 0) {
            return res.status(400).json({ success: false, error: "An error occurred with the database" });
        }

        // Get payment purpose and user_id from payments table
        const paymentQuery = "SELECT payment_purpose, user_id FROM payments WHERE payment_id = $1";
        const paymentResult = await pool.query(paymentQuery, [paymentId]);

        if (paymentResult.rows.length === 0) {
            return res.status(400).json({ success: false, error: "Payment not found" });
        }

        const { payment_purpose, user_id } = paymentResult.rows[0];

        // Update user's tier based on payment purpose
        let tier;
        switch (payment_purpose) {
            case "premium_tier_package":
                tier = "PREMIUM";
                break;
            case "basic-tier_package":
                tier = "BASIC";
                break;
            case "standard_tier_package":
                tier = "STANDARD";
                break;
            default:
                tier = "FREE";
        }

        const updateUserQuery = "UPDATE users SET tier = $1 WHERE user_id = $2";
        const updateUserValues = [tier, user_id];

        await pool.query(updateUserQuery, updateUserValues);

        return res.status(200).json({ success: true, message: "Payment confirmed successfully" });
    } catch (error) {
        console.error("Error while trying to update LipaNaMpesa details from the callback", error)
        res.status(503).send({
            message: "Something went wrong with the callback",
            error: error.message
        })
    }
}


// @desc Check from safaricom servers the status of a transaction
// @method GET
// @route /confirmPayment/:CheckoutRequestID
// @access public
const confirmPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        if (!paymentId) {
            return res.status(400).json({ success: false, error: "Payment ID is required" });
        };
        // Query the database to check payment status based on paymentId
        const query = "SELECT status FROM payments WHERE payment_id = $1";
        const result = await pool.query(query, [paymentId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Payment not found" });
        }
        return res.status(200).json({ success: true, status: result.rows[0].status });
    } catch (error) {
        errorHandler(error);
    }
};

module.exports = {
    initiateSTKPush,
    stkPushCallback,
    confirmPayment,
};
