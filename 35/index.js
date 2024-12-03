import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { CRMUsers } from './crm.mjs';
import libxmljs from "libxmljs";
import fs from 'fs';
const app = express();
app.use(bodyParser.json());
dotenv.config();

const removeSubstringSecurely = function(text, substring) {
    if (String(text).includes(substring)) {
        return removeSubstringSecurely(text.replace(substring, ''), substring);
    }
    return text;
}

const sanitizeInput = (input) => {
    let text = removeSubstringSecurely(input, "<!");
    text = removeSubstringSecurely(text, "SYSTEM");
    text = removeSubstringSecurely(text, "ENTITY");
    text = removeSubstringSecurely(text, "DOCTYPE");
    return text;
}

// Log the last request that failed
const logLastFailure = (message) => {
    fs.writeFile('/tmp/last_req.log', message, (err) => {
        if (err) { console.error(err); }
    });
}

// Remove the last request log
const removeLastRquestLog = () => {
    fs.unlink('/tmp/last_req.log', (err) => {
        if (err) { console.error(err); }
    });
}

app.post('/getCRMUsers', async (req, res) => {
    if(req.body.apiKey !== process.env.API_KEY) {
        const lastReq = `Expected API Key: ${process.env.API_KEY} | Received API Key: ${req.body.apiKey}`;
        logLastFailure(lastReq);
        res.status(401).end("Unauthorized");
    } else {
        removeLastRquestLog();
        res.send(CRMUsers);
    }
})

app.post('/createCard', async (req, res) => {
    try {
        const role = sanitizeInput(req.body.role);
        const firstName = sanitizeInput(req.body.firstName);
        const lastName = sanitizeInput(req.body.lastName);

        var xml = `<!--?xml version="1.0" ?-->
                    <!DOCTYPE userCard [
                                       <!ENTITY firstName "${firstName}">
                                       <!ENTITY lastName "${lastName}">
                                       <!ENTITY role "${role}">
                                    ]>
                    <userInfo>
                    <fullRef>&firstName; &lastName;, &role;</fullRef>
                    <firstName>&firstName;</firstName>
                    <lastName>&lastName;</lastName>
                    </userInfo>`;

        const doc = libxmljs.parseXml(xml, {replaceEntities: true});
        res.send(doc.toString());
        removeLastRquestLog();
    } catch (e) {
        logLastFailure(e.message);
        res.status(500).end(e.message);
        console.error(e);
    }
});

app.listen(process.env.port, () => {
    console.log(`API listening on PORT ${process.env.port}`)
})