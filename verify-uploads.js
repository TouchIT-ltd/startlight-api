const fs = require('fs');
const path = require('path');
// const FormData = require('form-data'); // Use native FormData in Node 18+

const BASE_URL = 'http://127.0.0.1:3000/api';

async function registerUser(role) {
    const email = `${role}_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`;
    const form = new FormData();
    form.append('fullname', `Test ${role}`);
    form.append('email', email);
    form.append('password', 'password123');
    form.append('phoneNumber', '+1234567890');
    form.append('role', role);

    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        body: form,
    });

    if (response.status !== 201) {
        console.error(`Register failed for ${role}: ${response.status}`, await response.text());
        return null;
    }
    const data = await response.json();

    // OTP Flow
    const otp = data.otpDetails?.data?.otp;
    await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
    });

    // Login
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
    });
    const loginData = await loginRes.json();
    return { ...data.user, token: loginData.accessToken };
}

async function createDummyImage(filename) {
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(filename, buffer);
    return filename;
}

async function verifyUploads() {
    console.log('--- Setup ---');
    const manager = await registerUser('manager');
    const owner = await registerUser('owner');

    if (!manager || !owner) { console.error('Failed to create users'); return; }
    console.log('Manager:', manager.id);
    console.log('Owner:', owner.id);

    const imagePath = await createDummyImage('test_image.png');

    // 1. Manager creates Property with Images
    console.log('\n--- 1. Manager creates Property with Images ---');
    const propForm = new FormData();
    propForm.append('name', 'Upload Prop');
    propForm.append('address', '123 Cloud St');
    propForm.append('description', 'With images');
    propForm.append('totalUnits', '10');
    propForm.append('ownerId', owner.id);

    const fileBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([fileBuffer], { type: 'image/png' });
    propForm.append('images', blob, 'test_image.png');

    const propRes = await fetch(`${BASE_URL}/properties`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${manager.token}`,
        },
        body: propForm,
    });

    const propData = await propRes.json();
    console.log('Prop Status:', propRes.status);
    console.log('Prop Images:', propData.images);

    if (propRes.status === 201 && propData.images && propData.images.length > 0) {
        console.log('SUCCESS: Property created with images');
    } else {
        console.error('FAILURE: Property image upload failed', propRes.status, JSON.stringify(propData));
    }

    // 2. Manager creates Unit with Image
    console.log('\n--- 2. Manager creates Unit with Image ---');
    const unitForm = new FormData();
    unitForm.append('propertyId', propData.id);
    unitForm.append('unitNumber', 'U-101');
    unitForm.append('description', 'Unit with image');
    unitForm.append('price', '1500');
    unitForm.append('duration', '12');
    unitForm.append('bedrooms', '2');
    unitForm.append('bathrooms', '1');
    unitForm.append('status', 'vacant');
    unitForm.append('image', blob, 'unit_image.png');

    const unitRes = await fetch(`${BASE_URL}/units`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${manager.token}`,
        },
        body: unitForm,
    });

    const unitData = await unitRes.json();
    console.log('Unit Status:', unitRes.status);
    console.log('Unit Image:', unitData.image);

    if (unitRes.status === 201 && unitData.image) {
        console.log('SUCCESS: Unit created with image');
    } else {
        console.error('FAILURE: Unit image upload failed', unitRes.status, JSON.stringify(unitData));
    }

    // Cleanup
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
}

verifyUploads();
