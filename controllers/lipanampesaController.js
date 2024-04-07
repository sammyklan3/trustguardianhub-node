const dotenv = require('dotenv');
const getTimestamp = require("../utils/utils.timestamp");
const { errorHandler, generateRandomAlphanumericId } = require("../config/middleware");
const ngrok = require("ngrok");
dotenv.config();
const fetch = require("node-fetch");


// @desc initiate stk push
// @method POST
// @route /stkPush
// @access public
const initiateSTKPush = async (req, res) => {
    try {
        const { amount, phone } = req.body;

        if (!amount || !phone) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const Order_ID = generateRandomAlphanumericId(10);

        console.log(Order_ID);

        const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
        const auth = "Bearer " + req.safaricom_access_token;
        const timestamp = getTimestamp();

        //shortcode + passkey + timestamp
        const password = Buffer.from(process.env.BUSINESS_SHORT_CODE + process.env.PASS_KEY + timestamp).toString("base64");

        // create callback url

        let callback_url;

        if (process.env.NODE_ENV === "development") {
            callback_url = await ngrok.connect(process.env.PORT);
            const api = ngrok.getApi();
            await api.listTunnels();
        } else {
            const host = req.get("host");
            const protocol = req.protocol;
            callback_url = `${protocol}://${host}/api/stkPushCallback/${Order_ID}`;
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
                "CallBackURL": process.env.NODE_ENV === "development" ? `${callback_url}/api/stkPushCallback/${Order_ID}` : callback_url,
                "AccountReference": "TrustGuardianHub",
                "TransactionDesc": "Test"
            }
        );

        const response = await fetch(url, {
            method: "POST",
            body: body,
            headers: headers
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

        //    order id
        const { Order_ID } = req.params

        console.log(req.body.Body)

        //callback details

        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = req.body.Body.stkCallback

        //     get the meta data from the meta
        const meta = Object.values(await CallbackMetadata.Item)
        const PhoneNumber = meta.find(o => o.Name === 'PhoneNumber').Value.toString()
        const Amount = meta.find(o => o.Name === 'Amount').Value.toString()
        const MpesaReceiptNumber = meta.find(o => o.Name === 'MpesaReceiptNumber').Value.toString()
        const TransactionDate = meta.find(o => o.Name === 'TransactionDate').Value.toString()

        // do something with the data
        console.log("-".repeat(20), " OUTPUT IN THE CALLBACK ", "-".repeat(20))
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
        `)

        res.json(true)

    } catch (e) {
        console.error("Error while trying to update LipaNaMpesa details from the callback", e)
        res.status(503).send({
            message: "Something went wrong with the callback",
            error: e.message
        })
    }
}

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

        const headers = {
            "Authorization": auth,
            "Content-Type": "application/json"
        };

        const body = JSON.stringify({
            "BusinessShortCode": process.env.BUSINESS_SHORT_CODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": req.params.CheckoutRequestID
        });

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: body
        });

        const responseBody = await response.json();
        res.status(response.status).json(responseBody);
    } catch (err) {
        errorHandler(err);
    }
};

module.exports = {
    initiateSTKPush,
    stkPushCallback,
    confirmPayment,
};
