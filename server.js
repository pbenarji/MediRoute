import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 5000);
const MONGODB_URI = process.env.MONGODB_URI?.trim();
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-only-mediroute-demo-secret');
const isProduction = process.env.NODE_ENV === 'production';
let databaseReady = false;

if (!JWT_SECRET) throw new Error('JWT_SECRET is required in production.');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org'],
      frameSrc: ['https://www.openstreetmap.org'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  }
}));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

const demoHospitals = [
  { id: 'demo-01', name: 'Harborview Community Hospital', city: 'Vijayawada', type: 'Private', address: 'Demo location · Benz Circle area', phone: '00000 00001', specialties: ['Cardiology', 'Orthopedics', 'General'], equipment: ['ICU', 'CT', 'X-Ray', 'ECG'], tags: ['Multispeciality', 'Emergency'], priceFactor: 1.08, opFee: 200, rating: 4.6, reviewCount: 48, icuBeds: 7, erWait: 18, emergency: true, doctors: [{ name: 'Dr. A. Rao', specialty: 'Cardiology', qualification: 'MD · Cardiology', years: 12, languages: ['English', 'Telugu'], fee: 650 }, { name: 'Dr. K. Sree', specialty: 'Orthopedics', qualification: 'MS · Orthopedics', years: 9, languages: ['English', 'Telugu'], fee: 500 }], coordinates: [80.648, 16.506] },
  { id: 'demo-02', name: 'Riverbend Medical Centre', city: 'Vijayawada', type: 'Government', address: 'Demo location · Governorpet area', phone: '00000 00002', specialties: ['General', 'Neurology'], equipment: ['ICU', 'MRI', 'ECG'], tags: ['Emergency', 'Children'], priceFactor: 0.68, opFee: 50, rating: 4.2, reviewCount: 31, icuBeds: 4, erWait: 26, emergency: true, doctors: [{ name: 'Dr. M. Devi', specialty: 'Neurology', qualification: 'DM · Neurology', years: 14, languages: ['English', 'Telugu'], fee: 350 }], coordinates: [80.621, 16.519] },
  { id: 'demo-03', name: 'Greenline Family Hospital', city: 'Vijayawada', type: 'Private', address: 'Demo location · Kanuru area', phone: '00000 00003', specialties: ['General', 'Maternity', 'Pediatrics'], equipment: ['ICU', 'Ultrasound', 'X-Ray'], tags: ['Maternity', 'Children'], priceFactor: 0.92, opFee: 150, rating: 4.4, reviewCount: 27, icuBeds: 3, erWait: 22, emergency: true, doctors: [{ name: 'Dr. P. Nisha', specialty: 'Pediatrics', qualification: 'MD · Pediatrics', years: 8, languages: ['English', 'Telugu', 'Hindi'], fee: 450 }], coordinates: [80.704, 16.484] },
  { id: 'demo-04', name: 'Lakeside Specialty Clinic', city: 'Vijayawada', type: 'Private', address: 'Demo location · Poranki area', phone: '00000 00004', specialties: ['Orthopedics', 'Dental', 'Eye care'], equipment: ['CT', 'X-Ray', 'ECG'], tags: ['Dental', 'Eye'], priceFactor: 0.86, opFee: 180, rating: 4.1, reviewCount: 19, icuBeds: 0, erWait: 0, emergency: false, doctors: [{ name: 'Dr. V. Kiran', specialty: 'Orthopedics', qualification: 'MS · Orthopedics', years: 11, languages: ['English', 'Telugu'], fee: 500 }], coordinates: [80.691, 16.456] },
  { id: 'demo-05', name: 'Mangalagiri Care Pavilion', city: 'Mangalagiri', type: 'Private', address: 'Demo location · Mangalagiri centre', phone: '00000 00005', specialties: ['Cardiology', 'General', 'Orthopedics'], equipment: ['ICU', 'CT', 'MRI', 'X-Ray'], tags: ['Multispeciality', 'Emergency'], priceFactor: 1.14, opFee: 250, rating: 4.7, reviewCount: 53, icuBeds: 5, erWait: 14, emergency: true, doctors: [{ name: 'Dr. S. Reddy', specialty: 'Cardiology', qualification: 'DM · Cardiology', years: 16, languages: ['English', 'Telugu'], fee: 800 }], coordinates: [80.559, 16.431] },
  { id: 'demo-06', name: 'Amaravati General Hospital', city: 'Mangalagiri', type: 'Government', address: 'Demo location · Tadepalli area', phone: '00000 00006', specialties: ['General', 'Neurology', 'Pediatrics'], equipment: ['ICU', 'MRI', 'ECG'], tags: ['Children', 'Emergency'], priceFactor: 0.62, opFee: 40, rating: 4.0, reviewCount: 22, icuBeds: 6, erWait: 32, emergency: true, doctors: [{ name: 'Dr. N. Arjun', specialty: 'Neurology', qualification: 'DM · Neurology', years: 10, languages: ['English', 'Telugu'], fee: 300 }], coordinates: [80.607, 16.466] },
  { id: 'demo-07', name: 'Canalview Medical House', city: 'Gudivada', type: 'Private', address: 'Demo location · Gudivada centre', phone: '00000 00007', specialties: ['General', 'Maternity', 'Orthopedics'], equipment: ['ICU', 'X-Ray', 'Ultrasound'], tags: ['Maternity', 'Emergency'], priceFactor: 0.79, opFee: 120, rating: 4.3, reviewCount: 17, icuBeds: 2, erWait: 19, emergency: true, doctors: [{ name: 'Dr. L. Kumari', specialty: 'Maternity', qualification: 'MD · Obstetrics', years: 13, languages: ['English', 'Telugu'], fee: 400 }], coordinates: [81.044, 16.435] },
  { id: 'demo-08', name: 'Township Health Centre', city: 'Gudivada', type: 'Government', address: 'Demo location · Nandivada road area', phone: '00000 00008', specialties: ['General', 'Pediatrics'], equipment: ['ICU', 'ECG'], tags: ['Children'], priceFactor: 0.58, opFee: 30, rating: 3.9, reviewCount: 13, icuBeds: 1, erWait: 29, emergency: true, doctors: [{ name: 'Dr. R. Teja', specialty: 'General', qualification: 'MBBS · General Medicine', years: 7, languages: ['English', 'Telugu'], fee: 180 }], coordinates: [81.067, 16.452] },
  { id: 'demo-09', name: 'Eluru Wellness Hospital', city: 'Eluru', type: 'Private', address: 'Demo location · Eluru centre', phone: '00000 00009', specialties: ['Cardiology', 'General', 'Eye care'], equipment: ['ICU', 'CT', 'ECG', 'X-Ray'], tags: ['Multispeciality', 'Eye', 'Emergency'], priceFactor: 1.02, opFee: 220, rating: 4.5, reviewCount: 36, icuBeds: 4, erWait: 17, emergency: true, doctors: [{ name: 'Dr. B. Ananya', specialty: 'Cardiology', qualification: 'MD · Cardiology', years: 10, languages: ['English', 'Telugu'], fee: 600 }], coordinates: [81.095, 16.710] },
  { id: 'demo-10', name: 'West Gate Community Hospital', city: 'Eluru', type: 'Government', address: 'Demo location · Powerpet area', phone: '00000 00010', specialties: ['General', 'Neurology', 'Orthopedics'], equipment: ['ICU', 'MRI', 'X-Ray'], tags: ['Emergency'], priceFactor: 0.64, opFee: 45, rating: 4.1, reviewCount: 25, icuBeds: 3, erWait: 23, emergency: true, doctors: [{ name: 'Dr. C. Prasad', specialty: 'Orthopedics', qualification: 'MS · Orthopedics', years: 15, languages: ['English', 'Telugu'], fee: 320 }], coordinates: [81.076, 16.713] },
  { id: 'demo-11', name: 'Sunrise Specialty Pavilion', city: 'Guntur', type: 'Private', address: 'Demo location · Brodipet area', phone: '00000 00011', specialties: ['Cardiology', 'Orthopedics', 'Maternity'], equipment: ['ICU', 'CT', 'MRI', 'Ultrasound'], tags: ['Multispeciality', 'Maternity', 'Emergency'], priceFactor: 1.12, opFee: 260, rating: 4.8, reviewCount: 61, icuBeds: 8, erWait: 12, emergency: true, doctors: [{ name: 'Dr. J. Sai', specialty: 'Cardiology', qualification: 'DM · Cardiology', years: 17, languages: ['English', 'Telugu'], fee: 900 }, { name: 'Dr. D. Meera', specialty: 'Maternity', qualification: 'MD · Obstetrics', years: 12, languages: ['English', 'Telugu'], fee: 650 }], coordinates: [80.436, 16.306] },
  { id: 'demo-12', name: 'Nagarjuna Family Medical Centre', city: 'Guntur', type: 'Government', address: 'Demo location · Arundelpet area', phone: '00000 00012', specialties: ['General', 'Pediatrics', 'Dental'], equipment: ['ICU', 'ECG', 'X-Ray'], tags: ['Children', 'Dental'], priceFactor: 0.6, opFee: 35, rating: 4.0, reviewCount: 20, icuBeds: 5, erWait: 28, emergency: true, doctors: [{ name: 'Dr. H. Raju', specialty: 'General', qualification: 'MBBS · General Medicine', years: 9, languages: ['English', 'Telugu'], fee: 220 }], coordinates: [80.451, 16.298] }
];

const hospitalSchema = new mongoose.Schema({
  demoId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true }, city: String, type: String, address: String, phone: String,
  specialties: [String], equipment: [String], tags: [String], priceFactor: Number, opFee: Number,
  rating: Number, reviewCount: Number, icuBeds: Number, erWait: Number, emergency: Boolean,
  doctors: [{ name: String, specialty: String, qualification: String, years: Number, languages: [String], fee: Number }],
  location: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: { type: [Number], default: [] } }
}, { timestamps: true });
hospitalSchema.index({ location: '2dsphere' });
const userSchema = new mongoose.Schema({ name: String, identifier: { type: String, unique: true }, passwordHash: String }, { timestamps: true });
const visitSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }, count: { type: Number, default: 0 }, lastVisit: Date });
visitSchema.index({ user: 1, hospital: 1 }, { unique: true });
const reviewSchema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }, stars: { type: Number, min: 1, max: 5 }, text: { type: String, maxlength: 400 } }, { timestamps: true });
reviewSchema.index({ user: 1, hospital: 1 }, { unique: true });
const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Visit = mongoose.models.Visit || mongoose.model('Visit', visitSchema);
const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

const demoUsers = [];
const demoReviews = [];
const demoVisits = [];
const toHospital = (doc) => {
  const h = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const coordinates = h.location?.coordinates || h.coordinates || [];
  return { ...h, id: String(h._id || h.id), coordinates, lat: coordinates[1], lng: coordinates[0] };
};
const cleanText = (value, max) => String(value || '').replace(/<[^>]*>/g, '').trim().slice(0, max);
const normalizeIdentifier = (value) => String(value || '').trim().toLowerCase();
const getRawHospitals = async () => databaseReady ? Hospital.find({}).lean() : demoHospitals;
const getHospitalById = async (id) => databaseReady ? Hospital.findById(id).lean() : demoHospitals.find((h) => h.id === id);

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (n) => n * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function specialtyFor(text) {
  const q = String(text || '').toLowerCase();
  if (/fracture|bone|joint|knee|back|orthop/.test(q)) return 'Orthopedics';
  if (/heart|chest|cardio|blood pressure|\bbp\b/.test(q)) return 'Cardiology';
  if (/brain|stroke|seizure|nerve|neuro/.test(q)) return 'Neurology';
  if (/pregnan|matern|delivery|obstet/.test(q)) return 'Maternity';
  if (/child|baby|pediatric/.test(q)) return 'Pediatrics';
  if (/eye|vision|ophthalm/.test(q)) return 'Eye care';
  if (/tooth|teeth|dental/.test(q)) return 'Dental';
  if (/fever|cold|infection|general|pain/.test(q)) return 'General';
  return null;
}
function buildPriceList(h) {
  const base = [
    ['OP slip', h.opFee || 100], ['Consultation', 350], ['General ward · per day', 900],
    ['Casualty assessment', 650], ['ECG', 450], ['Blood test', 320], ['X-Ray', 650], ['Ultrasound', 1_200]
  ];
  if (h.equipment?.includes('ICU')) base.push(['ICU · per day', 5_500]);
  if (h.equipment?.includes('CT')) base.push(['CT scan', 2_800]);
  if (h.equipment?.includes('MRI')) base.push(['MRI scan', 5_000]);
  const factor = Number(h.priceFactor || 1);
  return base.map(([label, amount]) => ({ label, amount: Math.round(amount * factor) }));
}

function readToken(req) {
  const token = req.cookies?.mediroute_session;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}
const requireAuth = (req, res, next) => {
  const session = readToken(req);
  if (!session?.sub) return res.status(401).json({ error: 'Please sign in to continue.' });
  req.userId = session.sub;
  req.userName = session.name;
  next();
};
function setSession(res, user) {
  const token = jwt.sign({ sub: String(user._id || user.id), name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie('mediroute_session', token, { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' });
}

app.get('/api/health', (_req, res) => res.json({ ok: true, database: databaseReady ? 'connected' : 'demo-memory', persistent: databaseReady, demoData: true }));
app.get('/api/hospitals', async (req, res, next) => {
  try {
    const { q = '', city = '', type = '', equipment = '', sort = 'distance', lat, lng } = req.query;
    const query = String(q).slice(0, 100).trim();
    const matchSpecialty = specialtyFor(query);
    const all = await getRawHospitals();
    const originLat = Number.isFinite(Number(lat)) && lat !== '' ? Number(lat) : 16.506;
    const originLng = Number.isFinite(Number(lng)) && lng !== '' ? Number(lng) : 80.648;
    let hospitals = all.map(toHospital).map((h) => ({ ...h, distanceKm: haversineKm(originLat, originLng, h.lat || 16.506, h.lng || 80.648) }));
    if (city) hospitals = hospitals.filter((h) => h.city.toLowerCase() === String(city).toLowerCase());
    if (type) hospitals = hospitals.filter((h) => h.type.toLowerCase() === String(type).toLowerCase());
    if (equipment) hospitals = hospitals.filter((h) => h.equipment.some((item) => item.toLowerCase() === String(equipment).toLowerCase()));
    if (req.query.emergency === 'true') hospitals = hospitals.filter((h) => h.emergency && h.equipment.includes('ICU'));
    if (req.query.rating === 'true') hospitals = hospitals.filter((h) => h.rating >= 4);
    if (req.query.tag) hospitals = hospitals.filter((h) => h.tags.includes(String(req.query.tag)));
    if (matchSpecialty) hospitals = hospitals.filter((h) => h.specialties.some((s) => s.toLowerCase() === matchSpecialty.toLowerCase()));
    else if (query) hospitals = hospitals.filter((h) => [h.name, h.city, h.address, ...h.specialties, ...h.tags].join(' ').toLowerCase().includes(query.toLowerCase()));
    if (sort === 'rating') hospitals.sort((a, b) => b.rating - a.rating);
    else if (sort === 'reviews') hospitals.sort((a, b) => b.reviewCount - a.reviewCount);
    else hospitals.sort((a, b) => a.distanceKm - b.distanceKm);
    res.json({ hospitals, count: hospitals.length, demoData: true });
  } catch (error) { next(error); }
});

app.get('/api/hospitals/live', async (_req, res, next) => {
  try {
    const hospitals = (await getRawHospitals()).map(toHospital).filter((h) => h.equipment.includes('ICU'));
    const now = Math.floor(Date.now() / 5000);
    const data = hospitals.map((h, index) => ({
      id: h.id, name: h.name, city: h.city, lat: h.lat, lng: h.lng,
      availableBeds: Math.max(0, h.icuBeds + ((now + index) % 3) - 1),
      erWait: Math.max(5, h.erWait + ((now * 3 + index * 7) % 11) - 5),
      emergency: h.emergency
    }));
    res.json({ hospitals: data, updatedAt: new Date().toISOString(), simulated: true });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', (req, res) => {
  const session = readToken(req);
  res.json({ user: session ? { id: session.sub, name: session.name } : null, databaseReady, demoMode: !databaseReady });
});
app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const name = cleanText(req.body?.name, 80);
    const identifier = normalizeIdentifier(req.body?.identifier);
    const password = String(req.body?.password || '');
    if (name.length < 2 || identifier.length < 4 || password.length < 8) return res.status(400).json({ error: 'Enter your name, mobile/email, and a password with at least 8 characters.' });
    const existing = databaseReady ? await User.findOne({ identifier }) : demoUsers.find((u) => u.identifier === identifier);
    if (existing) return res.status(409).json({ error: 'An account with this mobile or email already exists.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = databaseReady ? await User.create({ name, identifier, passwordHash }) : { id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name, identifier, passwordHash };
    if (!databaseReady) demoUsers.push(user);
    setSession(res, user);
    res.status(201).json({ user: { id: String(user._id || user.id), name: user.name }, databaseReady, demoMode: !databaseReady });
  } catch (error) { next(error); }
});
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const password = String(req.body?.password || '');
    const user = databaseReady ? await User.findOne({ identifier }) : demoUsers.find((u) => u.identifier === identifier);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Those sign-in details did not match.' });
    setSession(res, user);
    res.json({ user: { id: String(user._id || user.id), name: user.name }, databaseReady, demoMode: !databaseReady });
  } catch (error) { next(error); }
});
app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('mediroute_session', { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' });
  res.json({ ok: true });
});

app.get('/api/hospitals/:id', async (req, res, next) => {
  try {
    const hospital = await getHospitalById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });
    const h = toHospital(hospital);
    const session = readToken(req);
    let reviews = [], visitCount = 0, ownReview = null;
    if (databaseReady) {
      const reviewDocs = await Review.find({ hospital: h._id }).populate('user', 'name').sort({ createdAt: -1 }).limit(30).lean();
      reviews = reviewDocs.map((r) => ({ id: String(r._id), name: r.user?.name || 'Member', stars: r.stars, text: r.text, createdAt: r.createdAt }));
      if (session?.sub) {
        const visit = await Visit.findOne({ user: session.sub, hospital: h._id }).lean();
        visitCount = visit?.count || 0;
        ownReview = reviewDocs.find((r) => String(r.user?._id) === session.sub) || await Review.findOne({ user: session.sub, hospital: h._id }).lean();
      }
    } else if (session?.sub) {
      visitCount = demoVisits.find((v) => v.userId === session.sub && v.hospitalId === h.id)?.count || 0;
      ownReview = demoReviews.find((r) => r.userId === session.sub && r.hospitalId === h.id) || null;
      reviews = demoReviews.filter((r) => r.hospitalId === h.id).map((r) => ({ id: r.id, name: r.name, stars: r.stars, text: r.text, createdAt: r.createdAt }));
    } else reviews = demoReviews.filter((r) => r.hospitalId === h.id).map((r) => ({ id: r.id, name: r.name, stars: r.stars, text: r.text, createdAt: r.createdAt }));
    res.json({ hospital: { ...h, prices: buildPriceList(h) }, reviews, visitCount, ownReview: ownReview ? { stars: ownReview.stars, text: ownReview.text } : null, demoData: true, databaseReady });
  } catch (error) { next(error); }
});

app.post('/api/hospitals/:id/visit', requireAuth, async (req, res, next) => {
  try {
    const hospital = await getHospitalById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });
    if (databaseReady) {
      const visit = await Visit.findOneAndUpdate({ user: req.userId, hospital: hospital._id }, { $inc: { count: 1 }, $set: { lastVisit: new Date() } }, { upsert: true, new: true });
      return res.json({ count: visit.count, databaseReady: true });
    }
    let visit = demoVisits.find((v) => v.userId === req.userId && v.hospitalId === hospital.id);
    if (!visit) { visit = { userId: req.userId, hospitalId: hospital.id, count: 0 }; demoVisits.push(visit); }
    visit.count += 1;
    res.json({ count: visit.count, databaseReady: false });
  } catch (error) { next(error); }
});

app.post('/api/hospitals/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const hospital = await getHospitalById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });
    const stars = Number(req.body?.stars), text = cleanText(req.body?.text, 400);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5 || text.length < 3) return res.status(400).json({ error: 'Choose 1 to 5 stars and write at least 3 characters.' });
    if (databaseReady) {
      const prior = await Review.findOne({ user: req.userId, hospital: hospital._id });
      if (prior) return res.status(409).json({ error: 'You have already reviewed this hospital. Delete your review first to replace it.' });
      await Review.create({ user: req.userId, hospital: hospital._id, stars, text });
      const aggregate = await Review.aggregate([{ $match: { hospital: hospital._id } }, { $group: { _id: null, average: { $avg: '$stars' }, count: { $sum: 1 } } }]);
      await Hospital.updateOne({ _id: hospital._id }, { rating: Math.round((aggregate[0]?.average || 0) * 10) / 10, reviewCount: aggregate[0]?.count || 0 });
    } else {
      if (demoReviews.some((r) => r.userId === req.userId && r.hospitalId === hospital.id)) return res.status(409).json({ error: 'You have already reviewed this hospital. Delete your review first to replace it.' });
      const user = demoUsers.find((u) => u.id === req.userId);
      demoReviews.push({ id: `review-${Date.now()}`, userId: req.userId, hospitalId: hospital.id, name: user?.name || req.userName, stars, text, createdAt: new Date() });
    }
    res.status(201).json({ ok: true, databaseReady });
  } catch (error) { next(error); }
});
app.delete('/api/hospitals/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const hospital = await getHospitalById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });
    if (databaseReady) {
      await Review.deleteOne({ user: req.userId, hospital: hospital._id });
      const aggregate = await Review.aggregate([{ $match: { hospital: hospital._id } }, { $group: { _id: null, average: { $avg: '$stars' }, count: { $sum: 1 } } }]);
      await Hospital.updateOne({ _id: hospital._id }, { rating: Math.round((aggregate[0]?.average || 0) * 10) / 10, reviewCount: aggregate[0]?.count || 0 });
    } else {
      const index = demoReviews.findIndex((r) => r.userId === req.userId && r.hospitalId === hospital.id);
      if (index >= 0) demoReviews.splice(index, 1);
    }
    res.json({ ok: true });
  } catch (error) { next(error); }
});

app.get('/api/me/profile', requireAuth, async (req, res, next) => {
  try {
    if (databaseReady) {
      const user = await User.findById(req.userId).select('name identifier').lean();
      const visits = await Visit.find({ user: req.userId }).populate('hospital').lean();
      const reviews = await Review.find({ user: req.userId }).populate('hospital').sort({ createdAt: -1 }).lean();
      return res.json({ user, visits: visits.map((v) => ({ count: v.count, hospital: v.hospital ? toHospital(v.hospital) : null })), reviews: reviews.map((r) => ({ stars: r.stars, text: r.text, hospital: r.hospital ? toHospital(r.hospital) : null, createdAt: r.createdAt })), databaseReady: true });
    }
    const user = demoUsers.find((u) => u.id === req.userId);
    const visits = demoVisits.filter((v) => v.userId === req.userId).map((v) => ({ count: v.count, hospital: toHospital(demoHospitals.find((h) => h.id === v.hospitalId)) }));
    const reviews = demoReviews.filter((r) => r.userId === req.userId).map((r) => ({ stars: r.stars, text: r.text, hospital: toHospital(demoHospitals.find((h) => h.id === r.hospitalId)), createdAt: r.createdAt }));
    res.json({ user: user ? { name: user.name, identifier: user.identifier } : null, visits, reviews, databaseReady: false });
  } catch (error) { next(error); }
});

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8_000 })
    .then(async () => {
      databaseReady = true;
      const count = await Hospital.countDocuments();
      if (count === 0) await Hospital.insertMany(demoHospitals.map(({ id, coordinates, ...h }) => ({ ...h, demoId: id, location: { type: 'Point', coordinates } })));
      console.info(`MongoDB connected. ${count === 0 ? demoHospitals.length : count} sample hospital records are available.`);
    })
    .catch((error) => console.error('MongoDB connection failed; running temporary demo mode:', error.message));
} else {
  console.warn('MONGODB_URI is empty. MediRoute is using temporary in-memory demo mode; data will reset when the service restarts.');
}

if (isProduction) app.use(express.static(path.join(__dirname, 'dist'), { maxAge: '1h', index: false }));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (isProduction) return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  res.status(404).send('Frontend dev server is not available on this port. Run npm run dev in a second terminal.');
});
app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === 11000) return res.status(409).json({ error: 'That account or review already exists.' });
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, '0.0.0.0', () => console.info(`MediRoute API listening on port ${PORT}`));
