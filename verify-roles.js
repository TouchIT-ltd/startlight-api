const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3000/api';

async function registerUser(role) {
    const email = `${role}_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`;
    const form = new FormData();
    form.append('fullname', `Test ${role}`);
    form.append('email', email);
    form.append('password', 'password123');
    form.append('phoneNumber', '+1234567890');
    form.append('role', role);
    // form.append('ninSlip', ...); // Disabled for test stability

    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        body: form,
    });

    if (response.status !== 201) {
        const text = await response.text();
        console.error(`Status: ${response.status}`);
        console.error(`Response: ${text}`);
        return null;
    }

    const data = await response.json();
    console.log(`Registered ${role}. ID: ${data.user.id}`);

    // Extract OTP
    const otp = data.otpDetails?.data?.otp;
    if (!otp) {
        console.error('No OTP returned in registration response.');
        return null;
    }
    console.log(`Received OTP: ${otp}`);

    // Verify OTP
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
    });

    if (!verifyRes.ok) {
        console.error(`Failed to verify OTP for ${role}:`, verifyRes.status, await verifyRes.text());
        return null;
    }
    console.log(`Verified OTP for ${role}.`);

    // We need to login.
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
    });

    if (!loginRes.ok) {
        console.error(`Failed to login ${role}:`, loginRes.status, await loginRes.text());
        return null;
    }

    const loginData = await loginRes.json();
    return { ...data.user, token: loginData.accessToken };
}

async function verifyRoles() {
    console.log('--- Registering Users ---');
    const manager = await registerUser('manager');
    const owner = await registerUser('owner');

    if (!manager || !owner) {
        console.error('Failed to create users. Aborting.');
        return;
    }

    console.log('Manager ID:', manager.id);
    console.log('Owner ID:', owner.id);

    // 1. Manager creates Property with ownerId
    console.log('\n--- 1. Manager creates Property ---');
    const propRes = await fetch(`${BASE_URL}/properties`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${manager.token}`,
        },
        body: JSON.stringify({
            name: 'Manager Prop',
            address: '123 St',
            description: 'Desc',
            totalUnits: 10,
            ownerId: owner.id,
        }),
    });
    console.log('Status:', propRes.status); // Expect 201
    if (propRes.status !== 201) {
        console.log(await propRes.text());
    } else {
        const propData = await propRes.json();
        console.log('Property Created ID:', propData.id);
    }

    // 2. Owner tries to create Property
    console.log('\n--- 2. Owner creates Property ---');
    const propOwnerRes = await fetch(`${BASE_URL}/properties`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${owner.token}`,
        },
        body: JSON.stringify({
            name: 'Owner Prop',
            address: '456 St',
            description: 'Desc',
            totalUnits: 5,
            ownerId: owner.id,
        }),
    });
    console.log('Status:', propOwnerRes.status); // Expect 403
    if (propOwnerRes.status !== 403) console.log(await propOwnerRes.text());

    // 3. Manager creates Apartment with ownerId
    console.log('\n--- 3. Manager creates Apartment ---');
    const aptForm = new FormData();
    aptForm.append('title', 'Manager Apt');
    aptForm.append('price', '1000');
    aptForm.append('priceUnit', 'mo');
    aptForm.append('location', 'Loc');
    aptForm.append('city', 'City');
    aptForm.append('bedrooms', '2');
    aptForm.append('bathrooms', '1');
    aptForm.append('squareFeet', '800');
    aptForm.append('minTerm', '12');
    aptForm.append('minTermUnit', 'month');
    aptForm.append('ownerId', owner.id);

    const aptRes = await fetch(`${BASE_URL}/apartments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${manager.token}`,
        },
        body: aptForm,
    });
    console.log('Status:', aptRes.status); // Expect 201
    if (aptRes.status !== 201) {
        console.log(await aptRes.text());
    } else {
        const aptData = await aptRes.json();
        console.log('Apartment Created ID:', aptData.id);
    }

    // 4. Owner tries to create Apartment
    console.log('\n--- 4. Owner creates Apartment ---');
    const aptOwnerForm = new FormData();
    aptOwnerForm.append('title', 'Owner Apt');
    aptOwnerForm.append('price', '1000');
    aptOwnerForm.append('priceUnit', 'mo');
    aptOwnerForm.append('location', 'Loc');
    aptOwnerForm.append('city', 'City');
    aptOwnerForm.append('bedrooms', '2');
    aptOwnerForm.append('bathrooms', '1');
    aptOwnerForm.append('squareFeet', '800');
    aptOwnerForm.append('minTerm', '12');
    aptOwnerForm.append('minTermUnit', 'month');
    aptOwnerForm.append('ownerId', owner.id);

    const aptOwnerRes = await fetch(`${BASE_URL}/apartments`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${owner.token}`,
        },
        body: aptOwnerForm,
    });
    console.log('Status:', aptOwnerRes.status); // Expect 403
    if (aptOwnerRes.status !== 403) console.log(await aptOwnerRes.text());
}

verifyRoles();
