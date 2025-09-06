import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testAuth() {
  try {
    console.log('Testing registration...');
    const email = `test${Date.now()}@example.com`;
    const registerRes = await axios.post(`${API_URL}/api/auth/register`, {
      email,
      fullName: 'Test User',
      password: 'Test123!'
    });
    
    console.log('Register response:', registerRes.data);
    
    const { accessToken } = registerRes.data.data.tokens;
    
    console.log('\nTesting /api/auth/me with token...');
    const meRes = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    console.log('Me response:', meRes.data);
    
    console.log('\nTesting login...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email,
      password: 'Test123!'
    });
    
    console.log('Login response:', loginRes.data);
    
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testAuth();
