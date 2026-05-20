import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

initializeApp({
  credential: cert({
    projectId: 'pawtrol-eb66b',
    clientEmail: 'firebase-adminsdk-fbsvc@pawtrol-eb66b.iam.gserviceaccount.com',
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDNlBzw9DkkHB/J\nVQGs/ut5EdiuuvjZck63wumDzeXAyrXCnt9ypr5OUUQzxnuFtyjj55C5Rmz2Ysly\ngpU1W0vhtKgCM6Gyy9pUY1HovQIgzz4eGt2tkbp7yuQW0ZmxC0Jt6YKzo43uL5xo\nD1snVxkDsFsS780HR9A6MclWTFojzNC5UmJcnHynjX4lztla7wnHd0Mvv99EG89Q\nXSL77XnlyjpuLMthwYYC4jW72G4j3DmQUeXnQIBrmWeG8uPRVjjTAnGnPSa9wF8k\nZOTCd8hBd9IrT0IlSPC0abyV0q/eqkUmKPzRDMfeum52rz/79fibbKPJ8ILzaHxE\nz4WQfJYdAgMBAAECggEADSsdp3mdZ2i9yIG/d7tkjf7MqHSlmBgwXqkHmD/KJc1W\nUz8mBQwVSKMAAWkHZItU/TRKGvQd6rJtQP6IXECa3bxavrlb9D4GoD00c/oXds6P\nphIGfSXGkkNu1N9cPvD/slaw3pztbIJ0PF4vcperrIbRbqcZtQuulOu3f+WoKH7K\nwhH8a2hdRA6oJIRQuLvahcKm23obVxwGzTOXYVUqFTqY+LZy1bIbKoSjwH4exwqj\nx4RO7yylwWk8aesnaEvvPCEhklKOLQ+A6LJ5lJEt3Dfpq1zszWrrquyAlhOtr5LB\n1HV/XR9o+B4v0SASbYN3ZfTJe5eFhx6rNU1ejmWigQKBgQDqxpguChOBMEnjuScc\n7HotOzd11AePfkifP66LMFRjr/gq/rAVobwggnz/0XGgQJY7MGjQtobT2/wnYc1P\nzdnmOzgAfcbKCWagt3EU03hsT+z2dV3xS3/c/W54LgYtbcSmpNUJ0YdBaFDaqF28\n0gVvsnd1KxFXs2nDkINj8PCu0QKBgQDgKc8m8YbeK0kzicbC1N7FRsfgAsARQOyP\nuyl++wIh5QompocaufzOeTYd0eUUji3LgbBXsQ5CcyLuublQ97IDzRD0bWNONt7O\nomjhMFLBdA52hpW2LlKVvJTZKjEFeYeAD/GJN/F07b5Yc7Twd8IiIWpM91sD0R5p\nbiIvTBy9jQKBgQDIdeV+ehAJYMfWb0NcSPZRJJzIONBzzyoG/4LzScLkk13cqDaF\nYeGWCJTegWD5qewcgcsdWpxozQ7SOYnquCNzl+DLWpmf7ML6O2eMlrveD6iPD8u0\nufhlIuduKi4QIAenGlrk1UkdqgpPiS7wiIsnwkSJgMqADasi1oO5lAKN4QKBgFFk\nXOcTA5lftjCUcisEB+8xiBl6ZirdnAeEOcj1cwzDkS//f0bhCT4fHNsu/zK7fT1L\nVbBBhZ/zFlf/753KkkR3DRTzMv+PRM9agSJi3WmIrkezDmEb6LidxJ4lh68pNV32\nbAka2v1N5bNQL/6wPTkPUP2pQs7b+2LkrlzmEflxAoGBAKu2tpv7CZa5AiweTFJ+\nRBPMGGUJrMMZBU96Zh3zHv3lkzhFwCSZ7n+ntEXt+ZsAyO9UuDK2L3edF6sOzrse\n9jY8cpTuq4oqid/IdsTz+OXZDhohYMzf2pCOG++Al3wnzMoaXB2P0NsJDYQay8Yp\n8ifAR4WkOAx9DFOC8vo5S0jF\n-----END PRIVATE KEY-----\n",
  }),
  storageBucket: 'pawtrol-eb66b.firebasestorage.app',
});

const corsConfig = [
  {
    origin: ['https://pawtrolit.org', 'https://www.pawtrolit.org', 'https://pawtrol-ten.vercel.app', 'http://localhost:3000'],
    method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS'],
    maxAgeSeconds: 3600,
    responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumed-upload-id'],
  },
];

async function setCors() {
  const bucket = getStorage().bucket();
  console.log('Bucket name:', bucket.name);
  await bucket.setCorsConfiguration(corsConfig);
  console.log('✅ CORS configured successfully!');
}

setCors().catch(err => {
  console.error('❌ Error:', err.message);
});
