const dotenv = require('dotenv');
const getTimestamp = require("../utils/utils.timestamp");
const { errorHandler } = require("../config/middleware");
dotenv.config();
const ngrok = require("ngrok");
const fetch = require("node-fetch");

// @desc initiate stk push
// @method POST
// @route /stkPush
// @access public
const initiateSTKPush = async (req, res) => {
    try {
        const { amount, phone, Order_ID } = req.body;

        if (!amount || !phone || !Order_ID) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
        const auth = "Bearer " + req.safaricom_access_token;
        const timestamp = getTimestamp();

        //shortcode + passkey + timestamp
        const password = Buffer.from(process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp).toString("base64");

        // create callback url
        const callback_url = await ngrok.connect(process.env.PORT);

        console.log("callback ", callback_url);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": auth,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone,
                "PartyB": process.env.BUSINESS_SHORT_CODE,
                "PhoneNumber": phone,
                "CallBackURL": `${callback_url}/api/stkPushCallback/${Order_ID}`,
                "AccountReference": "TrustGuardianHub",
                "TransactionDesc": "Paid online"
            })
        });

        const responseBody = await response.json();
        res.status(response.status).json(responseBody);
    } catch (e) {
        errorHandler(e);
    }
};

// @desc callback route Safaricom will post transaction status
// @method POST
// @route /stkPushCallback/:Order_ID
// @access public
const stkPushCallback = async (req, res) => {
    try {
        // order id
        const { Order_ID } = req.params;
        if (!Order_ID) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        // callback details
        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = req.body.Body.stkCallback;

        // get the meta data from the meta
        const meta = Object.values(await CallbackMetadata.Item);
        const PhoneNumber = meta.find(o => o.Name === 'PhoneNumber').Value.toString();
        const Amount = meta.find(o => o.Name === 'Amount').Value.toString();
        const MpesaReceiptNumber = meta.find(o => o.Name === 'MpesaReceiptNumber').Value.toString();
        const TransactionDate = meta.find(o => o.Name === 'TransactionDate').Value.toString();

        // do something with the data
        console.log("-".repeat(20), " OUTPUT IN THE CALLBACK ", "-".repeat(20));
        console.log(`
            Order_ID : ${Order_ID},
            MerchantRequestID : ${MerchantRequestID},
            CheckoutRequestID: ${CheckoutRequestID},
            ResultCode: ${ResultCode},
            ResultDesc: ${ResultDesc},
            PhoneNumber : ${PhoneNumber},
            Amount: ${Amount}, 
            MpesaReceiptNumber: ${MpesaReceiptNumber},
            TransactionDate : ${TransactionDate}
        `);

        res.json(true);
    } catch (e) {
        console.error("Error while trying to update LipaNaMpesa details from the callback", e);
        res.status(503).send({
            message: "Something went wrong with the callback",
            error: e.message
        });
    }
};

// @desc Check from safaricom servers the status of a transaction
// @method GET
// @route /confirmPayment/:CheckoutRequestID
// @access public
const confirmPayment = async (req, res) => {
    try {
        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";
        const auth = "Bearer " + req.safaricom_access_token;
        const timestamp = getTimestamp();

        //shortcode + passkey + timestamp
        const password = Buffer.from(process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp).toString('base64');

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": auth,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": req.params.CheckoutRequestID
            })
        });

        const responseBody = await response.json();
        res.status(response.status).json(responseBody);
    } catch (e) {
        console.error("Error while trying to create LipaNaMpesa details", e);
        res.status(503).send({
            message: "Something went wrong while trying to create LipaNaMpesa details. Contact admin",
            error: e.message
        });
    }
};

module.exports = {
    initiateSTKPush,
    stkPushCallback,
    confirmPayment,
};
