import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  where,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../firebase/config';
import { 
  LogOut, 
  Bell,
  Dog,
  Search,
  Heart,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  List,
  Edit,
  BarChart3,
  TrendingUp,
  Users, 
  FileText
} from 'lucide-react';

// Breed options based on pet type
const DOG_BREEDS = [
  'Aspin',
  'Labrador Retriever',
  'Golden Retriever',
  'German Shepherd',
  'Bulldog',
  'Poodle',
  'Beagle',
  'Rottweiler',
  'Yorkshire Terrier',
  'Dachshund',
  'Siberian Husky',
  'Shih Tzu',
  'Boston Terrier',
  'Pomeranian',
  'Chihuahua',
  'Border Collie',
  'Mixed Breed',
  'Other'
];

const CAT_BREEDS = [
  'Puspin',
  'Persian',
  'Siamese',
  'Maine Coon',
  'British Shorthair',
  'Ragdoll',
  'Bengal',
  'Abyssinian',
  'Russian Blue',
  'American Shorthair',
  'Scottish Fold',
  'Sphynx',
  'Munchkin',
  'Norwegian Forest Cat',
  'Mixed Breed',
  'Other'
];

const TabButton = ({ active, label, icon: Icon, onClick, badge = 0 }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={active}
    className={`group flex items-center px-5 py-2.5 rounded-full text-sm font-semibold border transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
      active
        ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-600'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`}
  >
    <Icon className="h-5 w-5 mr-2 text-current" />
    <span>{label}</span>
    {badge > 0 && (
      <span
        className={`ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs ${
          active ? 'bg-white text-indigo-700' : 'bg-red-600 text-white'
        }`}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </button>
);

const inputBase =
  'mt-1 block w-full rounded-md border-2 border-gray-400 bg-white px-3 py-2 text-base text-gray-900 placeholder-gray-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const selectBase = 
  'mt-1 block w-full rounded-md border-2 border-gray-400 bg-white px-3 py-2 pr-10 text-base text-gray-900 placeholder-gray-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 relative z-10';

const selectBaseWithIcon = 
  'mt-1 block w-full rounded-md border-2 border-gray-400 bg-white pl-10 pr-10 py-2 text-base text-gray-900 placeholder-gray-600 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 relative z-10';

const labelBase = 'block text-sm font-medium text-gray-800';

const AdoptionForm = ({ adoptionForm, setAdoptionForm, submittingAdoption, onSubmit }) => {
  // Get breeds based on pet type
  const availableBreeds = adoptionForm.petType === 'dog' ? DOG_BREEDS : CAT_BREEDS;
  
  // Reset breed when pet type changes
  const handlePetTypeChange = (e) => {
    const newPetType = e.target.value;
    setAdoptionForm((p) => ({ 
      ...p, 
      petType: newPetType,
      breed: '', // Reset breed when changing pet type
      showBreedDropdown: false // Close dropdown when changing pet type
    }));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adoptionForm.showBreedDropdown && !event.target.closest('.breed-dropdown-container')) {
        setAdoptionForm((p) => ({ ...p, showBreedDropdown: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [adoptionForm.showBreedDropdown]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="max-w-md">
          <label className={labelBase}>Pet Name</label>
          <input
            className={inputBase}
            value={adoptionForm.petName}
            onChange={(e) => setAdoptionForm((p) => ({ ...p, petName: e.target.value }))}
            required
          />
        </div>
        <div className="max-w-md relative">
          <label className={labelBase}>Pet Type</label>
          <div className="relative">
            <select
              className={selectBase}
              value={adoptionForm.petType}
              onChange={handlePetTypeChange}
              required
              style={{ 
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: 'none'
              }}
            >
              <option value="">Select pet type</option>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" style={{zIndex: 10}}>
              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div className="max-w-md">
          <label className={labelBase}>Breed</label>
          <div className="relative breed-dropdown-container">
            <button
              type="button"
              className={`${selectBase} ${!adoptionForm.petType ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'cursor-pointer'}`}
              onClick={() => {
                if (adoptionForm.petType) {
                  setAdoptionForm((p) => ({ ...p, showBreedDropdown: !p.showBreedDropdown }));
                }
              }}
              disabled={!adoptionForm.petType}
              style={{ 
                textAlign: 'left'
              }}
            >
              {!adoptionForm.petType ? 'Select pet type first' : (adoptionForm.breed || 'Select a breed')}
            </button>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" style={{zIndex: 10}}>
              <svg className={`w-5 h-5 ${!adoptionForm.petType ? 'text-gray-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            {adoptionForm.showBreedDropdown && adoptionForm.petType && (
              <div className="absolute top-full left-0 right-0 bg-white border-2 border-gray-400 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                <div
                  className="px-3 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer"
                  onClick={() => setAdoptionForm((p) => ({ ...p, breed: '', showBreedDropdown: false }))}
                >
                  Select a breed
                </div>
                {availableBreeds.map((breed) => (
                  <div
                    key={breed}
                    className="px-3 py-2 text-gray-900 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setAdoptionForm((p) => ({ ...p, breed: breed, showBreedDropdown: false }))}
                  >
                    {breed}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      <div className="max-w-md">
        <label className={labelBase}>Age</label>
        <input
          className={inputBase}
          value={adoptionForm.age}
          onChange={(e) => setAdoptionForm((p) => ({ ...p, age: e.target.value }))}
          placeholder="e.g., 2 years"
        />
      </div>
      <div className="max-w-md relative">
        <label className={labelBase}>Gender</label>
        <div className="relative">
          <select
            className={selectBase}
            value={adoptionForm.gender}
            onChange={(e) => setAdoptionForm((p) => ({ ...p, gender: e.target.value }))}
            required
            style={{ 
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              backgroundImage: 'none'
            }}
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" style={{zIndex: 10}}>
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
      <div className="md:col-span-2 max-w-md">
        <label className={labelBase}>Description</label>
        <textarea
          className={inputBase}
          rows={3}
          value={adoptionForm.description || ''}
          onChange={(e) => setAdoptionForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Add notes about the pet's personality, behavior, and needs"
        />
      </div>
      <div className="md:col-span-2 max-w-md">
        <label className={labelBase}>Pet Image *</label>
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white px-3 py-2 text-base text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:text-indigo-700 hover:file:bg-indigo-100"
          onChange={(e) => setAdoptionForm((p) => ({ ...p, imageFile: e.target.files?.[0] || null }))}
          required
        />
        <p className="mt-1 text-sm text-gray-600">Please upload a clear photo of the pet</p>
      </div>
      {/* Medical treatments section */}
      <div className="md:col-span-2">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center space-x-2">
            <input 
              id="vaccinated" 
              type="checkbox" 
              checked={!!adoptionForm.vaccinated} 
              onChange={(e) => setAdoptionForm((p) => ({ 
                ...p, 
                vaccinated: e.target.checked,
                vaccinatedDate: e.target.checked ? p.vaccinatedDate : ''
              }))} 
              className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded" 
            />
            <label htmlFor="vaccinated" className="text-base text-gray-800">Vaccine</label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              id="dewormed" 
              type="checkbox" 
              checked={!!adoptionForm.dewormed} 
              onChange={(e) => setAdoptionForm((p) => ({ 
                ...p, 
                dewormed: e.target.checked,
                dewormedDate: e.target.checked ? p.dewormedDate : ''
              }))} 
              className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded" 
            />
            <label htmlFor="dewormed" className="text-base text-gray-800">Deworm</label>
          </div>
          <div className="flex items-center space-x-2">
            <input 
              id="antiRabies" 
              type="checkbox" 
              checked={!!adoptionForm.antiRabies} 
              onChange={(e) => setAdoptionForm((p) => ({ 
                ...p, 
                antiRabies: e.target.checked,
                antiRabiesDate: e.target.checked ? p.antiRabiesDate : ''
              }))} 
              className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded" 
            />
            <label htmlFor="antiRabies" className="text-base text-gray-800">Anti-rabies</label>
          </div>
        </div>
        
        {/* Date fields for checked treatments */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {adoptionForm.vaccinated && (
            <div>
              <label className={labelBase}>Vaccine Date</label>
              <input
                type="date"
                className={inputBase}
                value={adoptionForm.vaccinatedDate}
                onChange={(e) => setAdoptionForm((p) => ({ ...p, vaccinatedDate: e.target.value }))}
                required
              />
            </div>
          )}
          {adoptionForm.dewormed && (
            <div>
              <label className={labelBase}>Deworm Date</label>
              <input
                type="date"
                className={inputBase}
                value={adoptionForm.dewormedDate}
                onChange={(e) => setAdoptionForm((p) => ({ ...p, dewormedDate: e.target.value }))}
                required
              />
            </div>
          )}
          {adoptionForm.antiRabies && (
            <div>
              <label className={labelBase}>Anti-rabies Date</label>
              <input
                type="date"
                className={inputBase}
                value={adoptionForm.antiRabiesDate}
                onChange={(e) => setAdoptionForm((p) => ({ ...p, antiRabiesDate: e.target.value }))}
                required
              />
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2 md:col-span-2 max-w-md">
        <input
          id="readyForAdoption"
          type="checkbox"
          checked={adoptionForm.readyForAdoption}
          onChange={(e) => setAdoptionForm((p) => ({ ...p, readyForAdoption: e.target.checked }))}
          className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded"
        />
        <label htmlFor="readyForAdoption" className="text-base text-gray-800">Ready for Adoption</label>
      </div>
    </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submittingAdoption}
            className="px-4 py-2 rounded-md text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {submittingAdoption ? 'Submitting...' : 'Post for Adoption'}
          </button>
        </div>
      </form>
    );
  };

const ImpoundDashboard = () => {
  const { currentUser, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  const [strayReports, setStrayReports] = useState([]);
  const [lostReports, setLostReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adoptionApplications, setAdoptionApplications] = useState([]);
  const [adoptablePets, setAdoptablePets] = useState([]);
  const [submittingAdoption, setSubmittingAdoption] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAdoptable, setSelectedAdoptable] = useState(null);
  const [showAdoptableModal, setShowAdoptableModal] = useState(false);
  const [editingAdoptable, setEditingAdoptable] = useState(null);
  const [showEditAdoptableModal, setShowEditAdoptableModal] = useState(false);
  const [editAdoptForm, setEditAdoptForm] = useState({
    petName: '',
    petType: '',
    breed: '',
    age: '',
    gender: '',
    description: '',
    vaccinated: false,
    vaccinatedDate: '',
    dewormed: false,
    dewormedDate: '',
    antiRabies: false,
    antiRabiesDate: '',
    readyForAdoption: true,
    imageFile: null,
  });
  const [savingAdoptable, setSavingAdoptable] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adoptedPets, setAdoptedPets] = useState([]);
  // Browser notifications helpers
  const reportsSeenRef = useRef(new Set());
  const initialReportsLoadedRef = useRef(false);
  const appsSeenRef = useRef(new Set());
  const initialAppsLoadedRef = useRef(false);
  
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showAppModal, setShowAppModal] = useState(false);
  const [adoptionForm, setAdoptionForm] = useState({
    petName: '',
    petType: '',
    breed: '',
    age: '',
    gender: '',
    description: '',
    vaccinated: false,
    vaccinatedDate: '',
    dewormed: false,
    dewormedDate: '',
    antiRabies: false,
    antiRabiesDate: '',
    readyForAdoption: true,
    imageFile: null,
    showBreedDropdown: false
  });

  // Real-time feed for reports
  useEffect(() => {
    // Ask notification permission once
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const qReports = query(collection(db, 'stray_reports'), orderBy('reportTime', 'desc'));
    const unsubscribe = onSnapshot(qReports, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filteredNotifications = rows.filter((r) => !r.hiddenImpoundNotification);
      setNotifications(filteredNotifications);
      setUnreadCount(filteredNotifications.filter((n) => !n.impoundRead).length);
      setStrayReports(rows.filter((r) => (r.status || '').toLowerCase() === 'stray' || (r.status || '').toLowerCase() === 'in progress'));
      setLostReports(rows.filter((r) => (r.status || '').toLowerCase() === 'lost'));

      // Push notifications for new reports (stray or lost)
      if (!initialReportsLoadedRef.current) {
        // seed seen ids on first load (no notifications)
        reportsSeenRef.current = new Set(rows.map((r) => r.id));
        initialReportsLoadedRef.current = true;
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        for (const docSnap of snap.docChanges ? snap.docChanges() : []) {
          if (docSnap.type === 'added') {
            const data = docSnap.doc.data();
            const id = docSnap.doc.id;
            if (!reportsSeenRef.current.has(id)) {
              const statusLower = (data.status || '').toLowerCase();
              const kind = statusLower === 'lost' ? 'Lost pet report' : 'Stray report';
              const location = data.locationName || 'Unknown location';
              const desc = (data.description || '').toString();
              const body = `${desc ? desc.substring(0, 80) : 'New report received'} • ${location}`;
              try { new Notification(`New ${kind}`, { body }); } catch {}
              reportsSeenRef.current.add(id);
            }
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  // Adoption applications (submitted from mobile app)
  useEffect(() => {
    const qApps = query(collection(db, 'adoption_applications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(qApps, (snap) => {
      setAdoptionApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((app) => !app.hiddenFromAdmin)); // Filter out declined applications hidden from admin

      // Push notifications for new applications
      if (!initialAppsLoadedRef.current) {
        appsSeenRef.current = new Set(snap.docs.map((d) => d.id));
        initialAppsLoadedRef.current = true;
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        for (const change of snap.docChanges ? snap.docChanges() : []) {
          if (change.type === 'added') {
            const id = change.doc.id;
            const data = change.doc.data();
            if (!appsSeenRef.current.has(id)) {
              const applicant = data.applicant?.fullName || 'Applicant';
              const pet = data.petName || data.petBreed || 'a pet';
              const body = `${applicant} applied to adopt ${pet}`;
              try { new Notification('New Adoption Application', { body }); } catch {}
              appsSeenRef.current.add(id);
            }
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  // Adoptable pets posted by impound
  useEffect(() => {
    const qPets = query(collection(db, 'adoptable_pets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(qPets, (snap) => {
      setAdoptablePets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  // Adopted pets (transferred from impound)
  useEffect(() => {
    const qAdoptedPets = query(
      collection(db, 'pets'), 
      where('transferredFrom', '==', 'impound'),
      orderBy('transferredAt', 'desc')
    );
    const unsubscribe = onSnapshot(qAdoptedPets, (snap) => {
      setAdoptedPets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsubscribe;
  }, []);

  // Seed edit form when opening edit modal
  useEffect(() => {
    if (editingAdoptable && showEditAdoptableModal) {
      setEditAdoptForm({
        petName: editingAdoptable.petName || '',
        petType: editingAdoptable.petType || '',
        breed: editingAdoptable.breed || '',
        age: editingAdoptable.age || '',
        gender: editingAdoptable.gender || '',
        description: editingAdoptable.description || '',
        vaccinated: !!editingAdoptable.vaccinated,
        vaccinatedDate: editingAdoptable.vaccinatedDate || '',
        dewormed: !!editingAdoptable.dewormed,
        dewormedDate: editingAdoptable.dewormedDate || '',
        antiRabies: !!editingAdoptable.antiRabies,
        antiRabiesDate: editingAdoptable.antiRabiesDate || '',
        readyForAdoption: editingAdoptable.readyForAdoption !== false,
        imageFile: null,
      });
    }
  }, [editingAdoptable, showEditAdoptableModal]);

  const handleSaveEditAdoptable = async (e) => {
    e.preventDefault();
    if (!editingAdoptable) return;
    
    // Validate required fields
    if (!editAdoptForm.petName || !editAdoptForm.petType || !editAdoptForm.breed || !editAdoptForm.gender) {
      toast.error('Please fill in all required fields (Pet Name, Pet Type, Breed, Gender)');
      return;
    }

    // Validate medical treatment dates if treatments are checked
    if (editAdoptForm.vaccinated && !editAdoptForm.vaccinatedDate) {
      toast.error('Please provide vaccination date');
      return;
    }
    if (editAdoptForm.dewormed && !editAdoptForm.dewormedDate) {
      toast.error('Please provide deworm date');
      return;
    }
    if (editAdoptForm.antiRabies && !editAdoptForm.antiRabiesDate) {
      toast.error('Please provide anti-rabies date');
      return;
    }

    try {
      setSavingAdoptable(true);
      let imageUrl = editingAdoptable.imageUrl || null;
      if (editAdoptForm.imageFile) {
        const storage = getStorage();
        const storageRef = ref(storage, `adoptable_pets/${editingAdoptable.id}/${Date.now()}_${editAdoptForm.imageFile.name}`);
        await uploadBytes(storageRef, editAdoptForm.imageFile);
        imageUrl = await getDownloadURL(storageRef);
      }
      await updateDoc(doc(db, 'adoptable_pets', editingAdoptable.id), {
        petName: editAdoptForm.petName,
        petType: editAdoptForm.petType,
        breed: editAdoptForm.breed,
        age: editAdoptForm.age,
        gender: editAdoptForm.gender,
        description: editAdoptForm.description,
        vaccinated: !!editAdoptForm.vaccinated,
        vaccinatedDate: editAdoptForm.vaccinatedDate || '',
        dewormed: !!editAdoptForm.dewormed,
        dewormedDate: editAdoptForm.dewormedDate || '',
        antiRabies: !!editAdoptForm.antiRabies,
        antiRabiesDate: editAdoptForm.antiRabiesDate || '',
        readyForAdoption: !!editAdoptForm.readyForAdoption,
        ...(imageUrl ? { imageUrl } : {}),
      });
      toast.success('Pet updated successfully');
      setShowEditAdoptableModal(false);
      setEditingAdoptable(null);
    } catch (error) {
      console.error('Error updating pet:', error);
      toast.error('Failed to update pet: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingAdoptable(false);
    }
  };

  const handleLogout = async () => {
    const ok = window.confirm('Are you sure you want to logout?');
    if (!ok) return;
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  // Notifications: mark read/unread by toggling a flag on the report document
  const toggleNotificationRead = async (reportId, currentVal) => {
    try {
      await updateDoc(doc(db, 'stray_reports', reportId), {
        impoundRead: !currentVal
      });
    } catch (e) {
      toast.error('Failed to update notification');
    }
  };


  const handleDeleteAllNotifications = async () => {
    if ((notifications || []).length === 0) return;
    const ok = window.confirm('Remove all notifications from this list? (Reports are not deleted)');
    if (!ok) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => batch.update(doc(db, 'stray_reports', n.id), { hiddenImpoundNotification: true }));
      await batch.commit();
      toast.success('All notifications removed');
      setShowNotifications(false);
    } catch (e) {
      toast.error('Failed to remove notifications');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, 'stray_reports', notificationId), {
        impoundRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(notification => {
        if (!notification.impoundRead) {
          batch.update(doc(db, 'stray_reports', notification.id), { impoundRead: true });
        }
      });
      await batch.commit();
      setShowNotifications(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark notification as read
    if (!notification.impoundRead) {
      await markNotificationAsRead(notification.id);
    }
    
    // Open report details
    openReportDetails(notification);
    setShowNotifications(false);
  };

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notifications-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const openReportDetails = (report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  // Stray report actions
  const updateStrayStatus = async (reportId, newStatus) => {
    try {
      await updateDoc(doc(db, 'stray_reports', reportId), { status: newStatus });
      toast.success(`Report marked as ${newStatus}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  // Lost report: print
  const handlePrintLostReport = (report) => {
    try {
      const printWindow = window.open('', 'PRINT', 'height=650,width=900,top=100,left=150');
      if (!printWindow) return;
      const reportedAt = report.reportTime?.toDate ? report.reportTime.toDate().toLocaleString() : '';
      const html = `
        <html>
        <head>
          <title>Lost Pet Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111827; }
            h1 { font-size: 20px; margin: 0 0 12px; }
            .muted { color: #6B7280; font-size: 12px; }
            .section { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
            .row { display: flex; gap: 12px; }
            .col { flex: 1; }
            img { width: 100%; height: auto; border-radius: 8px; }
            .label { font-size: 12px; color: #6B7280; }
            .value { font-size: 14px; font-weight: 600; color: #111827; }
          </style>
        </head>
        <body>
          <h1>Lost Pet Report</h1>
          <div class="muted">Printed: ${new Date().toLocaleString()}</div>
          ${report.imageUrl ? `<div class="section"><img src="${report.imageUrl}" alt="pet" /></div>` : ''}
          <div class="section">
            <div class="row">
              <div class="col"><div class="label">Pet</div><div class="value">${report.petName ? `${report.petName} (${report.breed || report.petType || 'Pet'})` : (report.breed || report.petType || 'Pet')}</div></div>
              <div class="col"><div class="label">Reported At</div><div class="value">${reportedAt || 'N/A'}</div></div>
            </div>
            <div class="row">
              <div class="col"><div class="label">Last Seen / Location</div><div class="value">${report.locationName || 'N/A'}</div></div>
              <div class="col"><div class="label">Contact</div><div class="value">${report.contactNumber || 'N/A'}</div></div>
            </div>
          </div>
          ${report.description ? `<div class="section"><div class="label">Description</div><div class="value">${report.description}</div></div>` : ''}
          <script>window.onload = function(){ window.focus(); window.print(); };</script>
        </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (e) {
      // ignore
    }
  };

  // Adoption application helpers
  const openApplicationDetails = (app) => {
    setSelectedApplication(app);
    setShowAppModal(true);
  };

  const handleUpdateApplicationStatus = async (appId, status) => {
    try {
      await updateDoc(doc(db, 'adoption_applications', appId), { status });
      // Optimistically remove from table
      setAdoptionApplications((prev) => prev.filter((a) => a.id !== appId));
      if (selectedApplication?.id === appId) {
        setSelectedApplication(null);
        setShowAppModal(false);
      }
      toast.success(`Application marked as ${status}`);
    } catch (e) {
      toast.error('Failed to update application');
    }
  };

  const handleDeclineApplication = async (app) => {
    try {
      const reason = window.prompt('Please enter the reason for declining this application:');
      if (reason === null) return; // cancelled
      const trimmed = String(reason).trim();
      if (!trimmed) {
        toast.error('Decline reason is required');
        return;
      }
      await updateDoc(doc(db, 'adoption_applications', app.id), {
        status: 'Declined',
        notes: trimmed,
        declinedAt: serverTimestamp(),
        declinedBy: currentUser?.email || 'impound_admin',
        hiddenFromAdmin: true, // Add this field to hide from admin view
      });
      // Remove from the admin's view immediately
      setAdoptionApplications((prev) => prev.filter((a) => a.id !== app.id));
      if (selectedApplication?.id === app.id) {
        setSelectedApplication(null);
        setShowAppModal(false);
      }
      toast.success('Application declined');
    } catch (e) {
      toast.error('Failed to decline application');
    }
  };

  // Adoption submit
  const handleAdoptionSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!adoptionForm.petName || !adoptionForm.petType || !adoptionForm.breed || !adoptionForm.gender) {
      toast.error('Please fill in all required fields (Pet Name, Pet Type, Breed, Gender)');
      return;
    }

    // Validate image is required
    if (!adoptionForm.imageFile) {
      toast.error('Please upload a pet image');
      return;
    }

    // Validate medical treatment dates if treatments are checked
    if (adoptionForm.vaccinated && !adoptionForm.vaccinatedDate) {
      toast.error('Please provide vaccination date');
      return;
    }
    if (adoptionForm.dewormed && !adoptionForm.dewormedDate) {
      toast.error('Please provide deworm date');
      return;
    }
    if (adoptionForm.antiRabies && !adoptionForm.antiRabiesDate) {
      toast.error('Please provide anti-rabies date');
      return;
    }

    setSubmittingAdoption(true);
    try {
      let imageUrl = '';
      if (adoptionForm.imageFile) {
        const storage = getStorage();
        const file = adoptionForm.imageFile;
        const fileRef = ref(storage, `adoptable_pets/${Date.now()}_${file.name}`);
        await uploadBytes(fileRef, file);
        imageUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, 'adoptable_pets'), {
        petName: adoptionForm.petName,
        petType: adoptionForm.petType,
        breed: adoptionForm.breed,
        age: adoptionForm.age,
        gender: adoptionForm.gender,
        description: adoptionForm.description,
        vaccinated: !!adoptionForm.vaccinated,
        vaccinatedDate: adoptionForm.vaccinatedDate || '',
        dewormed: !!adoptionForm.dewormed,
        dewormedDate: adoptionForm.dewormedDate || '',
        antiRabies: !!adoptionForm.antiRabies,
        antiRabiesDate: adoptionForm.antiRabiesDate || '',
        imageUrl,
        readyForAdoption: !!adoptionForm.readyForAdoption,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'impound_admin'
      });

      toast.success('Adoptable pet posted successfully');
      
      // Reset form to match the current state structure
      setAdoptionForm({
        petName: '',
        petType: '',
        breed: '',
        age: '',
        gender: '',
        description: '',
        vaccinated: false,
        vaccinatedDate: '',
        dewormed: false,
        dewormedDate: '',
        antiRabies: false,
        antiRabiesDate: '',
        readyForAdoption: true,
        imageFile: null
      });
    } catch (error) {
      console.error('Error posting adoptable pet:', error);
      toast.error('Failed to post adoptable pet: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmittingAdoption(false);
    }
  };

  // Fetch all registered users from users collection
  const fetchRegisteredUsers = async () => {
    setLoadingUsers(true);
    try {
      // Get all users from users collection
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const usersMap = new Map();
      
      // Get all users from users collection
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        // Only include regular users, not admin users
        const role = userData.role || 'user';
        if (role === 'user' || role === 'regular') {
          usersMap.set(doc.id, {
            uid: doc.id,
            displayName: userData.name || userData.displayName || 'Unknown User',
            email: userData.email || 'No email',
            phone: userData.phone || 'No phone',
            address: userData.address || 'No address',
            status: userData.status || 'active',
            role: role,
            emailVerified: userData.emailVerified || false
          });
        }
      });
      
      // Enhance with adoption application data if available
      try {
        const appsQuery = query(collection(db, 'adoption_applications'));
        const appsSnapshot = await getDocs(appsQuery);
        
        appsSnapshot.docs.forEach(doc => {
          const appData = doc.data();
          if (appData.userId && usersMap.has(appData.userId) && appData.applicant) {
            const existingUser = usersMap.get(appData.userId);
            usersMap.set(appData.userId, {
              ...existingUser,
              // Override with more detailed info from adoption application if available
              displayName: appData.applicant.fullName || existingUser.displayName,
              phone: appData.applicant.phone || existingUser.phone,
              address: appData.applicant.address || existingUser.address,
              hasAdoptionApplication: true
            });
          }
        });
      } catch (error) {
        console.error('Error fetching adoption applications:', error);
      }

      const allUsers = Array.from(usersMap.values());
      console.log('Fetched users for transfer:', allUsers.length);
      setRegisteredUsers(allUsers);
      
      if (allUsers.length === 0) {
        toast.info('No registered users found. Users need to register in the mobile app to appear here.');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load registered users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Handle transfer pet to user
  const handleTransferPet = async () => {
    if (!selectedAdoptable || !selectedUser) return;
    
    setTransferring(true);
    try {
      // Add pet to the user's pets collection
      await addDoc(collection(db, 'pets'), {
        petName: selectedAdoptable.petName,
        petType: selectedAdoptable.breed?.toLowerCase().includes('cat') ? 'cat' : 'dog',
        petGender: selectedAdoptable.gender || 'male',
        breed: selectedAdoptable.breed,
        description: selectedAdoptable.description || '',
        ownerFullName: selectedUser.displayName,
        contactNumber: selectedUser.phone || 'N/A',
        petImage: selectedAdoptable.imageUrl || '',
        userId: selectedUser.uid,
        registeredDate: new Date().toISOString(),
        createdAt: serverTimestamp(), // Add this field for PetListScreen query
        transferredFrom: 'impound',
        transferredAt: serverTimestamp(),
        originalAdoptableId: selectedAdoptable.id,
        status: 'safe',
        vaccinated: selectedAdoptable.vaccinated || false,
        dewormed: selectedAdoptable.dewormed || false,
        antiRabies: selectedAdoptable.antiRabies || false,
        healthStatus: selectedAdoptable.healthStatus || ''
      });

      // Create notification for the user
      await addDoc(collection(db, 'user_notifications'), {
        userId: selectedUser.uid,
        type: 'pet_transfer',
        title: 'New Pet Transferred to You!',
        message: `Congratulations! ${selectedAdoptable.petName} (${selectedAdoptable.breed}) has been transferred to your care by the animal impound facility.`,
        petName: selectedAdoptable.petName,
        petBreed: selectedAdoptable.breed,
        petImage: selectedAdoptable.imageUrl || '',
        read: false,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'impound_admin'
      });

      // Remove from adoptable pets
      await deleteDoc(doc(db, 'adoptable_pets', selectedAdoptable.id));

      toast.success(`${selectedAdoptable.petName} has been successfully transferred to ${selectedUser.displayName}`);
      setShowTransferModal(false);
      setSelectedAdoptable(null);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error transferring pet:', error);
      toast.error('Failed to transfer pet. Please try again.');
    } finally {
      setTransferring(false);
    }
  };

  

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Dog className="h-8 w-8 text-white mr-3" />
              <h1 className="text-2xl font-bold text-white">Impound Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative notifications-container">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Bell className="h-5 w-5 text-gray-600 mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllNotificationsAsRead}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Mark all read
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleDeleteAllNotifications}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete all
                            </button>
                          )}
                          <button
                            onClick={() => setShowNotifications(false)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Notifications List */}
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No notifications yet</p>
                          <p className="text-sm text-gray-400">New reports will appear here</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notification.impoundRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {(notification.status || 'Report')} report submitted
                                  </p>
                                  {!notification.impoundRead && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.locationName || 'Unknown location'}
                                </p>
                                <div className="flex items-center justify-between mt-2">
                                  <p className="text-xs text-gray-400">
                                    {notification.reportTime?.toDate?.()?.toLocaleString() || 'Recently'}
                                  </p>
                                  <span className="text-xs text-blue-600 font-medium">
                                    Click to view details →
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Footer */}
                    {notifications.length > 10 && (
                      <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                        <p className="text-sm text-gray-500 text-center">
                          Showing 10 of {notifications.length} notifications
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 flex-wrap">
          <TabButton
            active={activeTab === 'analytics'}
            label="Dashboard"
            icon={BarChart3}
            onClick={() => setActiveTab('analytics')}
          />
          <TabButton
            active={activeTab === 'stray'}
            label="Stray Reports"
            icon={Search}
            badge={(strayReports || []).length}
            onClick={() => setActiveTab('stray')}
          />
          <TabButton
            active={activeTab === 'lost'}
            label="Lost Pet Reports"
            icon={ShieldCheck}
            badge={(lostReports || []).length}
            onClick={() => setActiveTab('lost')}
          />
          <TabButton active={activeTab === 'adoption'} label="Adoption" icon={Heart} onClick={() => setActiveTab('adoption')} />
          <TabButton active={activeTab === 'adoptionList'} label="Adoption List" icon={List} badge={(adoptablePets || []).length} onClick={() => setActiveTab('adoptionList')} />
          <TabButton active={activeTab === 'applications'} label="Applications" icon={List} badge={(adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length} onClick={() => setActiveTab('applications')} />
            </div>
          </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

        {activeTab === 'stray' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Stray Reports</h2>
            <div className="overflow-hidden ring-1 ring-black ring-opacity-5 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {strayReports.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900 max-w-md truncate">{r.description || 'No description'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{r.locationName || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {r.status || 'Stray'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex gap-2">
                          <button onClick={() => openReportDetails(r)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">View</button>
                          <button onClick={() => updateStrayStatus(r.id, 'In Progress')} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">In Progress</button>
                          <button onClick={() => updateStrayStatus(r.id, 'Resolved')} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Resolved</button>
                          <button onClick={() => updateStrayStatus(r.id, 'Invalid')} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Invalid</button>
                </div>
                      </td>
                    </tr>
                  ))}
                  {strayReports.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No stray reports</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'lost' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Lost Pet Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lostReports.map((r) => (
                <div key={r.id} className="border rounded-lg overflow-hidden bg-white flex flex-col h-full">
                  {r.imageUrl && !r.imageUrl.startsWith('file://') ? (
                    <img src={r.imageUrl} alt={r.petName || 'Pet'} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                      {r.imageUrl && r.imageUrl.startsWith('file://') ? 'Old Report' : 'No Image'}
                </div>
                  )}
                  <div className="p-4 flex flex-col items-center text-center flex-1">
                    <p className="text-base font-semibold text-gray-900 truncate w-full mb-2">
                      {r.petName ? `${r.petName} (${r.breed || r.petType || 'Pet'})` : 'Unspecified pet'}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">{r.locationName || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mb-3">{r.contactNumber || 'N/A'}</p>
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <button onClick={() => openReportDetails(r)} className="px-3 py-2 text-sm rounded-md border font-medium hover:bg-gray-50">View</button>
                      <button onClick={() => handlePrintLostReport(r)} className="px-3 py-2 text-sm rounded-md border font-medium hover:bg-gray-50">Print</button>
                      <a href={`tel:${r.contactNumber || ''}`} className="px-3 py-2 text-sm rounded-md border font-medium hover:bg-gray-50 text-center">Contact</a>
                </div>
              </div>
                </div>
              ))}
              {lostReports.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-500 py-8">No lost pet reports</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'adoption' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Post Adoptable Pet</h2>
            <AdoptionForm
              adoptionForm={adoptionForm}
              setAdoptionForm={setAdoptionForm}
              submittingAdoption={submittingAdoption}
              onSubmit={handleAdoptionSubmit}
            />
                </div>
        )}

        {activeTab === 'adoptionList' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Adoptable Pets</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {adoptablePets.map((p) => (
                <div key={p.id} className="border rounded-lg overflow-hidden bg-white flex flex-col h-full">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.petName || 'Pet'} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  <div className="p-4 flex flex-col items-center text-center flex-1">
                    <p className="text-base font-semibold text-gray-900 truncate w-full">{p.petName || 'Unnamed Pet'}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 w-full">
                      <button onClick={() => { setSelectedAdoptable(p); setShowTransferModal(true); fetchRegisteredUsers(); }} className="px-3 py-2 text-sm rounded-md border font-medium text-white bg-green-600 hover:bg-green-700">Transfer</button>
                      <button onClick={() => { setEditingAdoptable(p); setShowEditAdoptableModal(true); }} className="px-3 py-2 text-sm rounded-md border font-medium hover:bg-gray-50">Edit</button>
                      <button onClick={async () => { if (window.confirm('Delete this pet?')) { await deleteDoc(doc(db, 'adoptable_pets', p.id)); toast.success('Deleted'); } }} className="px-3 py-2 text-sm rounded-md border font-medium hover:bg-red-50 text-red-600 border-red-200">Delete</button>
                </div>
              </div>
            </div>
              ))}
              {adoptablePets.length === 0 && (
                <div className="col-span-full text-center text-sm text-gray-500 py-8">No adoptable pets</div>
              )}
          </div>
        </div>
        )}

        

        {activeTab === 'applications' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Adoption Applications</h2>
            <div className="overflow-hidden ring-1 ring-black ring-opacity-5 rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferred Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adoptionApplications.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{a.applicant?.fullName || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.petName || a.petBreed || 'Pet'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.preferredDate || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">{a.status || 'Submitted'}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex flex-wrap gap-2">
                          <button onClick={() => openApplicationDetails(a)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">View</button>
                          <button onClick={() => handleUpdateApplicationStatus(a.id, 'Approved')} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Approve</button>
                          <button onClick={() => handleDeclineApplication(a)} className="px-2 py-1 text-xs rounded border hover:bg-gray-50">Decline</button>
              </div>
                      </td>
                    </tr>
                  ))}
                  {adoptionApplications.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">No applications yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                    <FileText className="h-8 w-8 text-blue-600" />
                </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Reports</p>
                    <p className="text-2xl font-semibold text-gray-900">{(notifications || []).length}</p>
              </div>
            </div>
          </div>

              <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                    <Search className="h-8 w-8 text-green-600" />
                </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Stray Reports</p>
                    <p className="text-2xl font-semibold text-gray-900">{(strayReports || []).length}</p>
            </div>
          </div>
        </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ShieldCheck className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Lost Pet Reports</p>
                    <p className="text-2xl font-semibold text-gray-900">{(lostReports || []).length}</p>
              </div>
            </div>
          </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Heart className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Adoption Applications</p>
                    <p className="text-2xl font-semibold text-gray-900">{(adoptionApplications || []).length}</p>
              </div>
            </div>
          </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Adopted Pets</p>
                    <p className="text-2xl font-semibold text-gray-900">{(adoptedPets || []).length}</p>
                  </div>
                </div>
              </div>
        </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Application Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Application Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Submitted</span>
                    <span className="text-sm font-medium text-gray-900">
                      {(adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Approved</span>
                    <span className="text-sm font-medium text-green-600">
                      {(adoptionApplications || []).filter(a => a.status === 'Approved').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Declined</span>
                    <span className="text-sm font-medium text-red-600">
                      {(adoptionApplications || []).filter(a => a.status === 'Declined').length}
                  </span>
                </div>
                </div>
              </div>

              {/* Report Status Breakdown */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Report Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unread Notifications</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {(notifications || []).filter(n => !n.impoundRead).length}
                  </span>
                </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Found Pets</span>
                    <span className="text-sm font-medium text-green-600">
                      {(notifications || []).filter(n => n.status === 'Found').length}
                    </span>
              </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Adoptable Pets</span>
                    <span className="text-sm font-medium text-blue-600">
                      {(adoptablePets || []).length}
                  </span>
                </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Ready for Adoption</span>
                    <span className="text-sm font-medium text-green-600">
                      {(adoptablePets || []).filter(p => p.readyForAdoption !== false).length}
                    </span>
              </div>
            </div>
          </div>
        </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {notifications.slice(0, 5).map((notification, index) => (
                  <button
                    key={notification.id || index}
                    onClick={() => openReportDetails(notification)}
                    className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                        <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full mr-3 ${notification.impoundRead ? 'bg-gray-400' : 'bg-blue-500'}`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                          {(notification.status || 'Report')} report submitted
                        </p>
                        <p className="text-xs text-gray-500">
                          {notification.locationName || 'Unknown location'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {notification.reportTime?.toDate ? notification.reportTime.toDate().toLocaleString() : 'Unknown time'}
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        notification.impoundRead ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {notification.impoundRead ? 'Read' : 'Unread'}
                      </span>
                    </div>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                )}
                          </div>
                        </div>
                      </div>
        )}

        {/* View Adoptable Modal */}
        {showAdoptableModal && selectedAdoptable && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
              <div className="p-0 overflow-y-auto">
                <div className="rounded-lg border overflow-hidden">
                  {selectedAdoptable.imageUrl ? (
                    <img src={selectedAdoptable.imageUrl} alt="pet" className="w-full h-56 object-cover" />
                  ) : (
                    <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  <div className="p-5 space-y-5">
                    <div className="text-center">
                      <h4 className="text-xl font-semibold text-gray-900">{selectedAdoptable.petName || 'Pet Details'}</h4>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${selectedAdoptable.readyForAdoption !== false ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {selectedAdoptable.readyForAdoption !== false ? 'Ready for Adoption' : 'Not Ready'}
                        </span>
                  </div>
                </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Breed</p>
                        <p className="text-base font-medium text-gray-900">{selectedAdoptable.breed || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Age</p>
                        <p className="text-base font-medium text-gray-900">{selectedAdoptable.age || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Gender</p>
                        <p className="text-base font-medium text-gray-900">{selectedAdoptable.gender || 'N/A'}</p>
              </div>
                  <div>
                        <p className="text-sm text-gray-500">Health</p>
                        <p className="text-base font-medium text-gray-900">{selectedAdoptable.healthStatus || 'N/A'}</p>
                  </div>
                </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedAdoptable.description || 'N/A'}</p>
                </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-gray-500 mb-2">Medical</p>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${selectedAdoptable.vaccinated ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>Vaccine</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${selectedAdoptable.dewormed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>Deworm</span>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${selectedAdoptable.antiRabies ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>Anti-rabies</span>
                </div>
              </div>
            </div>
          </div>
        </div>
            <div className="p-4 border-t flex justify-end gap-2">
                <button onClick={() => setShowAdoptableModal(false)} className="px-3 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Adoptable Modal */}
        {showEditAdoptableModal && editingAdoptable && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Edit {editingAdoptable.petName || 'Pet'}</h3>
                <button onClick={() => setShowEditAdoptableModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <form onSubmit={handleSaveEditAdoptable} className="p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="max-w-md">
                    <label className={labelBase}>Pet Name</label>
                    <input className={inputBase} value={editAdoptForm.petName} onChange={(e) => setEditAdoptForm((p) => ({ ...p, petName: e.target.value }))} required />
                  </div>
                  <div className="max-w-md relative">
                    <label className={labelBase}>Pet Type</label>
                    <div className="relative">
                      <select
                        className={selectBase}
                        value={editAdoptForm.petType}
                        onChange={(e) => {
                          const newPetType = e.target.value;
                          setEditAdoptForm((p) => ({ 
                            ...p, 
                            petType: newPetType,
                            breed: '' // Reset breed when changing pet type
                          }));
                        }}
                        required
                        style={{ 
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundImage: 'none'
                        }}
                      >
                        <option value="">Select pet type</option>
                        <option value="dog">Dog</option>
                        <option value="cat">Cat</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-600"></div>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-md relative">
                    <label className={labelBase}>Breed</label>
                    <div className="relative">
                      <select
                        className={selectBase}
                        value={editAdoptForm.breed}
                        onChange={(e) => setEditAdoptForm((p) => ({ ...p, breed: e.target.value }))}
                        required
                        style={{ 
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundImage: 'none'
                        }}
                      >
                        <option value="">Select a breed</option>
                        {(editAdoptForm.petType === 'dog' ? DOG_BREEDS : CAT_BREEDS).map((breed) => (
                          <option key={breed} value={breed}>
                            {breed}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" style={{zIndex: 10}}>
                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-md">
                    <label className={labelBase}>Age</label>
                    <input className={inputBase} value={editAdoptForm.age} onChange={(e) => setEditAdoptForm((p) => ({ ...p, age: e.target.value }))} />
                </div>
                  <div className="max-w-md relative">
                    <label className={labelBase}>Gender</label>
                    <div className="relative">
                      <select 
                        className={selectBase} 
                        value={editAdoptForm.gender} 
                        onChange={(e) => setEditAdoptForm((p) => ({ ...p, gender: e.target.value }))} 
                        required
                        style={{ 
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          MozAppearance: 'none',
                          backgroundImage: 'none'
                        }}
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3" style={{zIndex: 10}}>
                        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-md">
                    <label className={labelBase}>Health Status</label>
                    <input className={inputBase} value={editAdoptForm.healthStatus} onChange={(e) => setEditAdoptForm((p) => ({ ...p, healthStatus: e.target.value }))} />
                </div>
                  <div className="max-w-md md:col-span-2">
                    <label className={labelBase}>Description</label>
                    <textarea className={inputBase} rows={3} value={editAdoptForm.description} onChange={(e) => setEditAdoptForm((p) => ({ ...p, description: e.target.value }))} />
                  </div>
                  {/* Medical treatments section for edit form */}
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="flex items-center space-x-2">
                        <input 
                          id="editVaccinated" 
                          type="checkbox" 
                          checked={!!editAdoptForm.vaccinated} 
                          onChange={(e) => setEditAdoptForm((p) => ({ 
                            ...p, 
                            vaccinated: e.target.checked,
                            vaccinatedDate: e.target.checked ? p.vaccinatedDate : ''
                          }))} 
                          className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded" 
                        />
                        <label htmlFor="editVaccinated" className="text-base text-gray-800">Vaccine</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          id="editDewormed" 
                          type="checkbox" 
                          checked={!!editAdoptForm.dewormed} 
                          onChange={(e) => setEditAdoptForm((p) => ({ 
                            ...p, 
                            dewormed: e.target.checked,
                            dewormedDate: e.target.checked ? p.dewormedDate : ''
                          }))} 
                          className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded" 
                        />
                        <label htmlFor="editDewormed" className="text-base text-gray-800">Deworm</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          id="editAntiRabies" 
                          type="checkbox" 
                          checked={!!editAdoptForm.antiRabies} 
                          onChange={(e) => setEditAdoptForm((p) => ({ 
                            ...p, 
                            antiRabies: e.target.checked,
                            antiRabiesDate: e.target.checked ? p.antiRabiesDate : ''
                          }))} 
                          className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded" 
                        />
                        <label htmlFor="editAntiRabies" className="text-base text-gray-800">Anti-rabies</label>
                      </div>
                    </div>
                    
                    {/* Date fields for checked treatments in edit form */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {editAdoptForm.vaccinated && (
                        <div>
                          <label className={labelBase}>Vaccine Date</label>
                          <input
                            type="date"
                            className={inputBase}
                            value={editAdoptForm.vaccinatedDate}
                            onChange={(e) => setEditAdoptForm((p) => ({ ...p, vaccinatedDate: e.target.value }))}
                            required
                          />
                        </div>
                      )}
                      {editAdoptForm.dewormed && (
                        <div>
                          <label className={labelBase}>Deworm Date</label>
                          <input
                            type="date"
                            className={inputBase}
                            value={editAdoptForm.dewormedDate}
                            onChange={(e) => setEditAdoptForm((p) => ({ ...p, dewormedDate: e.target.value }))}
                            required
                          />
                        </div>
                      )}
                      {editAdoptForm.antiRabies && (
                        <div>
                          <label className={labelBase}>Anti-rabies Date</label>
                          <input
                            type="date"
                            className={inputBase}
                            value={editAdoptForm.antiRabiesDate}
                            onChange={(e) => setEditAdoptForm((p) => ({ ...p, antiRabiesDate: e.target.value }))}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2 max-w-md">
                    <label className={labelBase}>Image</label>
                    <input type="file" accept="image/*" className="mt-1 block w-full rounded-md border-2 border-gray-400 bg-white px-3 py-2 text-base text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:text-indigo-700 hover:file:bg-indigo-100" onChange={(e) => setEditAdoptForm((p) => ({ ...p, imageFile: e.target.files?.[0] || null }))} />
                </div>
                  <div className="flex items-center space-x-2 md:col-span-2 max-w-md">
                    <input id="editReadyForAdoption" type="checkbox" checked={!!editAdoptForm.readyForAdoption} onChange={(e) => setEditAdoptForm((p) => ({ ...p, readyForAdoption: e.target.checked }))} className="h-5 w-5 text-indigo-600 border-2 border-gray-400 rounded" />
                    <label htmlFor="editReadyForAdoption" className="text-base text-gray-800">Ready for Adoption</label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowEditAdoptableModal(false)} className="px-4 py-2 rounded-md text-sm bg-gray-100 hover:bg-gray-200">Cancel</button>
                  <button type="submit" disabled={savingAdoptable} className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">{savingAdoptable ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
                  </div>
                </div>
        )}
      </main>

      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Report Details</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
            <div className="p-4 space-y-3">
              {selectedReport.imageUrl && !selectedReport.imageUrl.startsWith('file://') ? (
                <img 
                  src={selectedReport.imageUrl} 
                  alt="report" 
                  className="w-full h-64 object-cover rounded"
                  onError={(e) => {
                    console.log('Image failed to load in modal:', selectedReport.imageUrl);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                  {selectedReport.imageUrl && selectedReport.imageUrl.startsWith('file://') ? 'Old Report (Image Not Available)' : 'No Image Available'}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-base font-medium text-gray-900">{selectedReport.status || 'N/A'}</p>
            </div>
                <div>
                  <p className="text-sm text-gray-500">Reported At</p>
                  <p className="text-base font-medium text-gray-900">{selectedReport.reportTime?.toDate ? selectedReport.reportTime.toDate().toLocaleString() : 'N/A'}</p>
          </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-base font-medium text-gray-900">{selectedReport.locationName || 'N/A'}</p>
                  </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{selectedReport.description || 'No description'}</p>
                </div>
                {(selectedReport.petName || selectedReport.contactNumber) && (
                  <>
                  <div>
                      <p className="text-sm text-gray-500">Pet</p>
                      <p className="text-base font-medium text-gray-900">{selectedReport.petName ? `${selectedReport.petName} (${selectedReport.breed || selectedReport.petType || 'Pet'})` : 'N/A'}</p>
                </div>
                  <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="text-base font-medium text-gray-900">{selectedReport.contactNumber || 'N/A'}</p>
                  </div>
                  </>
                )}
                  </div>
                </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200">Close</button>
              </div>
            </div>
          </div>
      )}

      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b text-center">
              <h3 className="text-xl font-semibold text-gray-900">Adoption Application</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedApplication.petName || selectedApplication.petBreed || 'Pet'}</p>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  (selectedApplication.status || 'Submitted') === 'Approved' ? 'bg-green-100 text-green-700' :
                  (selectedApplication.status || 'Submitted') === 'Declined' ? 'bg-red-100 text-red-700' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {selectedApplication.status || 'Submitted'}
                  </span>
                </div>
              </div>
            <div className="p-0 overflow-y-auto">
              <div className="p-4 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Applicant</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">{selectedApplication.applicant?.fullName}</p>
                    <div className="mt-2 text-sm text-gray-700">
                      <a className="underline" href={`tel:${selectedApplication.applicant?.phone || ''}`}>{selectedApplication.applicant?.phone || 'N/A'}</a>
                      <span className="mx-2">•</span>
                      <a className="underline" href={`mailto:${selectedApplication.applicant?.email || ''}`}>{selectedApplication.applicant?.email || 'N/A'}</a>
                </div>
                    <p className="mt-2 text-sm text-gray-700">{selectedApplication.applicant?.address || 'No address provided'}</p>
              </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Pet</p>
                    <p className="mt-1 text-base font-semibold text-gray-900">{selectedApplication.petName || selectedApplication.petBreed || 'Pet'}</p>
                    <div className="mt-2">
                      <p className="text-xs uppercase tracking-wide text-gray-500">Preferred Date</p>
                      <p className="text-sm text-gray-900">{selectedApplication.preferredDate || 'N/A'}</p>
            </div>
          </div>
        </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Household</p>
                    <p className="mt-1 text-sm text-gray-900">Adults: {selectedApplication.household?.adults || '0'} • Children: {selectedApplication.household?.children || '0'}</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Residence</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.household?.residenceType || 'N/A'}</p>
                    <p className="text-sm text-gray-900">Landlord Approval: {selectedApplication.household?.landlordApproval ? 'Yes' : 'No'}</p>
                          </div>
                        </div>

                {selectedApplication.experience ? (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Experience</p>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.experience}</p>
                  </div>
                ) : null}

                {selectedApplication.currentPets ? (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Current Pets</p>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.currentPets}</p>
                  </div>
                ) : null}

                {selectedApplication.lifestyle ? (
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Lifestyle</p>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.lifestyle}</p>
                      </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Vet</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication.vet?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-900">{selectedApplication.vet?.phone || 'N/A'}</p>
                  </div>
                  {selectedApplication.references ? (
                    <div className="rounded-lg border p-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500">References</p>
                      <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedApplication.references}</p>
                </div>
                  ) : null}
              </div>
                  </div>
                </div>
            <div className="p-4 border-t flex flex-wrap justify-end gap-2">
              <button onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'Approved')} className="px-3 py-2 rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700">Approve</button>
              <button onClick={() => handleDeclineApplication(selectedApplication)} className="px-3 py-2 rounded-md text-sm font-semibold text-white bg-red-600 hover:bg-red-700">Decline</button>
              <button onClick={() => setSelectedApplication(null)} className="px-3 py-2 rounded-md text-sm font-semibold text-white bg-gray-700 hover:bg-gray-800">Close</button>
              </div>
            </div>
          </div>
      )}

      {/* Transfer Pet Modal */}
      {showTransferModal && selectedAdoptable && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 text-indigo-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                Transfer {selectedAdoptable.petName} to New Owner
              </h3>
              <button 
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedUser(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Pet Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 mb-2">Pet Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedAdoptable.petName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Breed:</span>
                    <span className="ml-2 font-medium">{selectedAdoptable.breed}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Gender:</span>
                    <span className="ml-2 font-medium">{selectedAdoptable.gender}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Age:</span>
                    <span className="ml-2 font-medium">{selectedAdoptable.age || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* User Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <svg className="w-5 h-5 text-indigo-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    Select New Owner
                  </h4>
                  <button
                    onClick={fetchRegisteredUsers}
                    disabled={loadingUsers}
                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loadingUsers ? 'Loading...' : 'Refresh Users'}
                  </button>
                </div>

                {loadingUsers ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-2 text-gray-600">Loading registered users...</p>
                  </div>
                ) : registeredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No registered users found.</p>
                    <button
                      onClick={fetchRegisteredUsers}
                      className="mt-2 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Load Users
                    </button>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {registeredUsers.map((user) => (
                      <div
                        key={user.uid}
                        className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                          selectedUser?.uid === user.uid ? 'bg-indigo-50 border-indigo-200' : ''
                        }`}
                        onClick={() => setSelectedUser(user)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 flex items-center">
                                <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                                {user.displayName}
                              </h5>
                              <p className="text-sm text-gray-600 flex items-center">
                                <svg className="w-4 h-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                {user.email}
                              </p>
                            </div>
                          </div>
                          {selectedUser?.uid === user.uid && (
                            <div className="text-indigo-600">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferPet}
                disabled={!selectedUser || transferring}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferring ? 'Transferring...' : 'Transfer Pet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpoundDashboard; 