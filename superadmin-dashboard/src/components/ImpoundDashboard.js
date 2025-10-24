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
  FileText,
  Archive
} from 'lucide-react';
import LogoWhite from '../assets/Logowhite.png';

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
    className={`group flex items-center w-full px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active
        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
    }`}
  >
    <Icon className="h-5 w-5 mr-3 text-current" />
    <span className="flex-1 text-left">{label}</span>
    {badge > 0 && (
      <span
        className={`ml-2 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium ${
          active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
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
  
  // Function to open Google Maps with coordinates
  const openGoogleMaps = (location, locationName) => {
    if (!location || !location.latitude || !location.longitude) {
      alert('Location coordinates not available');
      return;
    }
    
    const { latitude, longitude } = location;
    const encodedLocationName = encodeURIComponent(locationName || 'Pet Location');
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    
    // Open in new tab
    window.open(googleMapsUrl, '_blank');
  };
  const [activeTab, setActiveTab] = useState('analytics');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeApplicationTab, setActiveApplicationTab] = useState('pending');
  const [strayReports, setStrayReports] = useState([]);
  const [lostReports, setLostReports] = useState([]);
  const [incidentReports, setIncidentReports] = useState([]);
  const [foundReports, setFoundReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adoptionApplications, setAdoptionApplications] = useState([]);
  const [adoptablePets, setAdoptablePets] = useState([]);
  const [submittingAdoption, setSubmittingAdoption] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [strayChartData, setStrayChartData] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [lastDataUpdate, setLastDataUpdate] = useState(new Date());
  const [adoptedPets, setAdoptedPets] = useState([]);
  const [reportsExpanded, setReportsExpanded] = useState(true);
  const [adoptionExpanded, setAdoptionExpanded] = useState(true);
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  
  // Database totals for insights
  const [dbTotals, setDbTotals] = useState({
    totalReports: 0,
    strayReports: 0,
    lostReports: 0,
    incidentReports: 0,
    foundReports: 0,
    adoptionApplications: 0,
    adoptedPets: 0
  });

  // Helper functions for image loading states
  const setImageLoading = (imageId, isLoading) => {
    setImageLoadingStates(prev => ({
      ...prev,
      [imageId]: isLoading
    }));
  };

  const isImageLoading = (imageId) => {
    return imageLoadingStates[imageId] === true;
  };

  // Image component with loading indicator
  const ImageWithLoading = ({ src, alt, className, imageId, fallbackContent }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    const handleLoad = () => {
      console.log('Image loaded:', src);
      setIsLoading(false);
      setHasLoaded(true);
    };

    const handleError = () => {
      console.log('Image error:', src);
      setIsLoading(false);
      setHasError(true);
    };

    // Only reset loading state if this is a new image that hasn't been loaded before
    React.useEffect(() => {
      if (src && !hasLoaded) {
        setIsLoading(true);
        setHasError(false);
      }
    }, [src, hasLoaded]);

    if (hasError) {
      return fallbackContent || (
        <div className={`${className} bg-gray-200 flex items-center justify-center`}>
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      );
    }

    return (
      <div className="relative">
        <img
          src={src}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={{ 
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    );
  };

  // Generate chart data for adopted pets
  const generateAdoptedPetsChartData = (adoptedPets) => {
    const now = new Date();
    const months = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Count adopted pets in this month
      const monthPets = adoptedPets.filter(pet => {
        const petDate = pet.adoptedAt?.toDate ? pet.adoptedAt.toDate() : new Date(pet.adoptedAt);
        return petDate.getMonth() === date.getMonth() && 
               petDate.getFullYear() === date.getFullYear();
      });
      
      months.push({
        month: monthName,
        count: monthPets.length,
        date: date
      });
    }
    
    return months;
  };

  // Generate chart data for stray reports
  const generateStrayReportsChartData = (strayReports) => {
    const now = new Date();
    const months = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Count stray reports in this month
      const monthReports = strayReports.filter(report => {
        const reportDate = report.reportTime?.toDate ? report.reportTime.toDate() : new Date(report.reportTime);
        return reportDate.getMonth() === date.getMonth() && 
               reportDate.getFullYear() === date.getFullYear();
      });
      
      months.push({
        month: monthName,
        count: monthReports.length,
        date: date
      });
    }
    
    return months;
  };

  // Calculate real growth percentage for adopted pets
  const calculateAdoptedPetsGrowth = (chartData) => {
    if (chartData.length < 2) return 0;
    const currentMonth = chartData[chartData.length - 1]?.count || 0;
    const previousMonth = chartData[chartData.length - 2]?.count || 0;
    
    if (previousMonth === 0) return currentMonth > 0 ? 100 : 0;
    return Math.round(((currentMonth - previousMonth) / previousMonth) * 100);
  };

  // Calculate real growth percentage for stray reports
  const calculateStrayReportsGrowth = (chartData) => {
    if (chartData.length < 2) return 0;
    const currentMonth = chartData[chartData.length - 1]?.count || 0;
    const previousMonth = chartData[chartData.length - 2]?.count || 0;
    
    if (previousMonth === 0) return currentMonth > 0 ? 100 : 0;
    return Math.round(((currentMonth - previousMonth) / previousMonth) * 100);
  };

  // Generate SVG path for chart line based on real data
  const generateChartPath = (chartData, maxValue = 10) => {
    if (!chartData || chartData.length === 0) return "M 20,180 L 20,180";
    
    const points = chartData.map((data, index) => {
      const x = 20 + (index * 80);
      const y = 180 - Math.min((data.count / maxValue) * 160, 160);
      return `${x},${y}`;
    });
    
    if (points.length === 1) {
      return `M ${points[0]} L ${points[0]}`;
    }
    
    return `M ${points[0]} L ${points.slice(1).join(' L ')}`;
  };

  // Generate SVG path for chart area fill
  const generateChartAreaPath = (chartData, maxValue = 10) => {
    if (!chartData || chartData.length === 0) return "M 20,180 L 20,180 L 20,180 Z";
    
    const points = chartData.map((data, index) => {
      const x = 20 + (index * 80);
      const y = 180 - Math.min((data.count / maxValue) * 160, 160);
      return `${x},${y}`;
    });
    
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    return `M ${firstPoint} L ${points.slice(1).join(' L ')} L ${lastPoint.split(',')[0]},180 L 20,180 Z`;
  };

  // Debug useEffect for notification modal state
  useEffect(() => {
    console.log('showNotificationModal changed:', showNotificationModal);
    console.log('selectedNotification changed:', selectedNotification);
  }, [showNotificationModal, selectedNotification]);

  // Generate chart data when data changes (real-time updates)
  useEffect(() => {
    if (adoptablePets && strayReports) {
      setIsDataLoading(true);
      const adoptedPets = adoptablePets.filter(pet => pet.adoptedAt);
      setChartData(generateAdoptedPetsChartData(adoptedPets));
      setStrayChartData(generateStrayReportsChartData(strayReports));
      setLastDataUpdate(new Date());
      setIsDataLoading(false);
    }
  }, [adoptablePets, strayReports]);

  // Real-time chart data updates for better performance
  useEffect(() => {
    if (adoptedPets && strayReports) {
      setChartData(generateAdoptedPetsChartData(adoptedPets));
      setStrayChartData(generateStrayReportsChartData(strayReports));
      setLastDataUpdate(new Date());
    }
  }, [adoptedPets, strayReports]);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [selectedIncidentForDecline, setSelectedIncidentForDecline] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [showStrayDeclineModal, setShowStrayDeclineModal] = useState(false);
  const [selectedStrayForDecline, setSelectedStrayForDecline] = useState(null);
  const [strayDeclineReason, setStrayDeclineReason] = useState('');
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
    const unsubscribe = onSnapshot(
      qReports, 
      (snap) => {
        try {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const filteredNotifications = rows.filter((r) => 
        !r.hiddenImpoundNotification && 
        (r.status || '').toLowerCase() !== 'resolved' &&
        (r.status || '').toLowerCase() !== 'completed' &&
        (r.status || '').toLowerCase() !== 'declined'
      );
          
          // Update all report types in real-time
      setNotifications(filteredNotifications);
      setUnreadCount(filteredNotifications.filter((n) => !n.impoundRead).length);
      setStrayReports(rows.filter((r) => (r.status || '').toLowerCase() === 'stray' || (r.status || '').toLowerCase() === 'in progress'));
      setLostReports(rows.filter((r) => (r.status || '').toLowerCase() === 'lost'));
      setIncidentReports(rows.filter((r) => (r.status || '').toLowerCase() === 'incident'));
      // Only show found reports that were NOT marked as found by the owner
      setFoundReports(rows.filter((r) => (r.status || '').toLowerCase() === 'found' && r.foundBy !== 'owner'));

      // Push notifications for new reports (stray, lost, or incident)
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
              const kind = statusLower === 'lost' ? 'Lost pet report' : statusLower === 'incident' ? 'Incident report' : 'Stray report';
              const location = data.locationName || 'Unknown location';
              const desc = (data.description || '').toString();
              const body = `${desc ? desc.substring(0, 80) : 'New report received'} • ${location}`;
              try { new Notification(`New ${kind}`, { body }); } catch {}
              reportsSeenRef.current.add(id);
            }
          }
        }
      }
        } catch (error) {
          console.error('Error processing reports data:', error);
          toast.error('Failed to load reports data');
        }
      },
      (error) => {
        console.error('Error in reports listener:', error);
        toast.error('Failed to connect to reports database');
      }
    );
    return unsubscribe;
  }, []);

  // Adoption applications (submitted from mobile app)
  useEffect(() => {
    const qApps = query(collection(db, 'adoption_applications'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(qApps, (snap) => {
      setAdoptionApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

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

  // Fetch database totals for insights
  useEffect(() => {
    const fetchDbTotals = async () => {
      try {
        // Fetch all stray reports count
        const strayReportsQuery = query(collection(db, 'stray_reports'));
        const strayReportsSnapshot = await getDocs(strayReportsQuery);
        const strayReportsCount = strayReportsSnapshot.size;

        // Fetch lost reports count
        const lostReportsQuery = query(collection(db, 'stray_reports'), where('status', '==', 'Lost'));
        const lostReportsSnapshot = await getDocs(lostReportsQuery);
        const lostReportsCount = lostReportsSnapshot.size;

        // Fetch incident reports count
        const incidentReportsQuery = query(collection(db, 'stray_reports'), where('status', '==', 'Incident'));
        const incidentReportsSnapshot = await getDocs(incidentReportsQuery);
        const incidentReportsCount = incidentReportsSnapshot.size;

        // Fetch found reports count (excluding those found by owner)
        const foundReportsQuery = query(collection(db, 'stray_reports'), where('status', '==', 'Found'));
        const foundReportsSnapshot = await getDocs(foundReportsQuery);
        const foundReportsCount = foundReportsSnapshot.docs.filter(doc => doc.data().foundBy !== 'owner').length;

        // Fetch adoption applications count
        const adoptionAppsQuery = query(collection(db, 'adoption_applications'));
        const adoptionAppsSnapshot = await getDocs(adoptionAppsQuery);
        const adoptionAppsCount = adoptionAppsSnapshot.size;

        // Fetch adopted pets count (transferred from impound)
        const adoptedPetsQuery = query(collection(db, 'pets'), where('transferredFrom', '==', 'impound'));
        const adoptedPetsSnapshot = await getDocs(adoptedPetsQuery);
        const adoptedPetsCount = adoptedPetsSnapshot.size;

        // Calculate total reports
        const totalReportsCount = strayReportsCount;

        setDbTotals({
          totalReports: totalReportsCount,
          strayReports: strayReportsCount,
          lostReports: lostReportsCount,
          incidentReports: incidentReportsCount,
          foundReports: foundReportsCount,
          adoptionApplications: adoptionAppsCount,
          adoptedPets: adoptedPetsCount
        });
      } catch (error) {
        console.error('Error fetching database totals:', error);
      }
    };

    // Fetch immediately
    fetchDbTotals();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchDbTotals, 30000);
    
    return () => clearInterval(interval);
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


  const deleteNotification = async (notificationId) => {
    const confirmed = window.confirm('Are you sure you want to delete this notification? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await updateDoc(doc(db, 'stray_reports', notificationId), { hiddenImpoundNotification: true });
      toast.success('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
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

  const handleNotificationClick = async (notification, event) => {
    console.log('Notification clicked:', notification);
    console.log('Event:', event);
    
    // Prevent event propagation to avoid closing the modal
    event.stopPropagation();
    event.preventDefault();
    
    try {
    // Mark notification as read
    if (!notification.impoundRead) {
      await markNotificationAsRead(notification.id);
        console.log('Notification marked as read');
      }
      
      // Show notification detail modal
      setSelectedNotification(notification);
      setShowNotificationModal(true);
      console.log('Notification detail modal should open');
      console.log('Selected notification:', notification);
    } catch (error) {
      console.error('Error in handleNotificationClick:', error);
    }
  };

  // Close notifications dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && 
          !event.target.closest('.notifications-container') && 
          !event.target.closest('[data-notification-detail-modal]')) {
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
      await updateDoc(doc(db, 'stray_reports', reportId), { 
        status: newStatus,
        ...(newStatus === 'Resolved' && {
          resolvedAt: serverTimestamp(),
          resolvedBy: currentUser?.email || 'Unknown'
        })
      });

      // Create notification for resolved stray reports
      if (newStatus === 'Resolved') {
        const report = strayReports.find(r => r.id === reportId);
        if (report && report.userId) {
          await addDoc(collection(db, 'user_notifications'), {
            userId: report.userId,
            type: 'stray_resolved',
            title: 'Stray Report Resolved',
            message: `Your stray report has been resolved by the animal impound facility. Thank you for reporting this stray animal.`,
            reportId: report.id,
            reportType: 'stray',
            location: report.locationName || 'Unknown location',
            read: false,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.email || 'impound_admin'
          });
        }
      }

      toast.success(`Report marked as ${newStatus}`);
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  // Lost report: print
  const handlePrintLostReport = (report) => {
    try {
      const reportedAt = report.reportTime?.toDate ? report.reportTime.toDate().toLocaleString() : '';
      
      // Create a temporary div with the print content
      const printContent = document.createElement('div');
      printContent.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 8px; color: #111827; width: 100%; height: 100vh; display: flex; flex-direction: column; box-sizing: border-box;">
          <div style="text-align: center; margin-bottom: 8px;">
            <h1 style="font-size: 32px; margin: 0; color: #DC2626; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">MISSING</h1>
            <h2 style="font-size: 20px; margin: 2px 0 0; color: #111827; font-weight: 600;">Lost Pet Report</h2>
            <div style="color: #6B7280; font-size: 9px; margin-top: 2px;">Printed: ${new Date().toLocaleString()}</div>
            </div>
          
          <div style="display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0;">
            ${report.imageUrl ? `
              <div style="text-align: center; flex: 1; display: flex; align-items: center; justify-content: center; min-height: 0;">
                <img src="${report.imageUrl}" alt="Pet Image" style="max-width: 100%; max-height: 100%; height: auto; border-radius: 8px; border: 2px solid #DC2626; object-fit: contain;" />
            </div>
            ` : ''}
            
            <div style="border: 2px solid #DC2626; border-radius: 6px; padding: 8px; background-color: #FEF2F2; flex-shrink: 0;">
              <div style="display: flex; gap: 12px; margin-bottom: 6px;">
                <div style="flex: 1;">
                  <div style="font-size: 10px; color: #DC2626; margin-bottom: 1px; font-weight: 600;">Pet Name</div>
                  <div style="font-size: 12px; font-weight: 700; color: #111827;">${report.petName ? `${report.petName} (${report.breed || report.petType || 'Pet'})` : (report.breed || report.petType || 'Pet')}</div>
          </div>
                <div style="flex: 1;">
                  <div style="font-size: 10px; color: #DC2626; margin-bottom: 1px; font-weight: 600;">Reported At</div>
                  <div style="font-size: 12px; font-weight: 700; color: #111827;">${reportedAt || 'N/A'}</div>
                </div>
              </div>
              <div style="display: flex; gap: 12px;">
                <div style="flex: 1;">
                  <div style="font-size: 10px; color: #DC2626; margin-bottom: 1px; font-weight: 600;">Last Seen Location</div>
                  <div style="font-size: 12px; font-weight: 700; color: #111827;">${report.locationName || 'N/A'}</div>
                </div>
                <div style="flex: 1;">
                  <div style="font-size: 10px; color: #DC2626; margin-bottom: 1px; font-weight: 600;">Contact Number</div>
                  <div style="font-size: 12px; font-weight: 700; color: #111827;">${report.contactNumber || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            ${report.description ? `
              <div style="border: 2px solid #DC2626; border-radius: 6px; padding: 8px; background-color: #FEF2F2; flex-shrink: 0;">
                <div style="font-size: 10px; color: #DC2626; margin-bottom: 4px; font-weight: 600;">Description</div>
                <div style="font-size: 11px; color: #111827; line-height: 1.3; font-weight: 500;">${report.description}</div>
              </div>
            ` : ''}
            
            <div style="text-align: center; padding: 6px; background-color: #FEF2F2; border-radius: 6px; border: 2px solid #DC2626; flex-shrink: 0;">
              <div style="font-size: 12px; font-weight: 700; color: #DC2626; margin-bottom: 2px;">If Found, Please Contact Immediately</div>
              <div style="font-size: 10px; color: #111827;">This pet is dearly missed by its family</div>
            </div>
          </div>
        </div>
      `;
      
      // Add to document temporarily
      document.body.appendChild(printContent);
      
      // Create print styles
      const printStyles = document.createElement('style');
      printStyles.textContent = `
        @media print {
          body * { visibility: hidden; }
          .print-content, .print-content * { visibility: visible; }
          .print-content { position: absolute; left: 0; top: 0; width: 100%; height: 100vh; }
          @page { margin: 0.3in; size: A4; }
          * { box-sizing: border-box; }
        }
      `;
      document.head.appendChild(printStyles);
      
      // Add print-content class
      printContent.classList.add('print-content');
      
      // Trigger print
      window.print();
      
      // Clean up
      document.body.removeChild(printContent);
      document.head.removeChild(printStyles);
      
      toast.success('Print dialog opened');
      
    } catch (e) {
      console.error('Print error:', e);
      toast.error('Failed to open print dialog');
    }
  };

  // Incident report: resolve
  const handleResolveIncident = async (report) => {
    try {
      await updateDoc(doc(db, 'stray_reports', report.id), {
        status: 'Resolved',
        originalType: report.status, // Preserve the original report type
        resolvedAt: serverTimestamp(),
        resolvedBy: currentUser?.email || 'Unknown'
      });

      // Create notification for the user who reported the incident
      if (report.userId) {
        await addDoc(collection(db, 'user_notifications'), {
          userId: report.userId,
          type: 'incident_resolved',
          title: 'Incident Report Resolved',
          message: `Your incident report has been resolved by the animal impound facility. Thank you for reporting this incident.`,
          reportId: report.id,
          reportType: 'incident',
          location: report.locationName || 'Unknown location',
          read: false,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'impound_admin'
        });
      }

      toast.success('Incident report resolved successfully');
    } catch (error) {
      console.error('Error resolving incident report:', error);
      toast.error('Failed to resolve incident report');
    }
  };

  // Incident report: decline
  const handleDeclineIncident = (report) => {
    setSelectedIncidentForDecline(report);
    setDeclineReason('');
    setShowDeclineModal(true);
  };

  // Incident report: confirm decline with reason
  const handleConfirmDeclineIncident = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining the incident report');
      return;
    }

    try {
      await updateDoc(doc(db, 'stray_reports', selectedIncidentForDecline.id), {
        status: 'Declined',
        originalType: selectedIncidentForDecline.status, // Preserve the original report type
        declinedAt: serverTimestamp(),
        declinedBy: currentUser?.email || 'Unknown',
        declineReason: declineReason.trim()
      });

      // Create notification for the user who reported the incident
      if (selectedIncidentForDecline.userId) {
        await addDoc(collection(db, 'user_notifications'), {
          userId: selectedIncidentForDecline.userId,
          type: 'incident_declined',
          title: 'Incident Report Declined',
          message: `Your incident report has been declined. Reason: ${declineReason.trim()}`,
          reportId: selectedIncidentForDecline.id,
          reportType: 'incident',
          location: selectedIncidentForDecline.locationName || 'Unknown location',
          declineReason: declineReason.trim(),
          read: false,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'impound_admin'
        });
      }

      toast.success('Incident report declined successfully');
      setShowDeclineModal(false);
      setSelectedIncidentForDecline(null);
      setDeclineReason('');
    } catch (error) {
      console.error('Error declining incident report:', error);
      toast.error('Failed to decline incident report');
    }
  };

  // Stray report: decline
  const handleDeclineStray = (report) => {
    setSelectedStrayForDecline(report);
    setStrayDeclineReason('');
    setShowStrayDeclineModal(true);
  };

  // Stray report: confirm decline with reason
  const handleConfirmDeclineStray = async () => {
    if (!strayDeclineReason.trim()) {
      toast.error('Please provide a reason for declining the stray report');
      return;
    }

    try {
      await updateDoc(doc(db, 'stray_reports', selectedStrayForDecline.id), {
        status: 'Declined',
        declinedAt: serverTimestamp(),
        declinedBy: currentUser?.email || 'Unknown',
        declineReason: strayDeclineReason.trim()
      });

      // Create notification for the user who reported the stray
      if (selectedStrayForDecline.userId) {
        await addDoc(collection(db, 'user_notifications'), {
          userId: selectedStrayForDecline.userId,
          type: 'stray_declined',
          title: 'Stray Report Declined',
          message: `Your stray report has been declined. Reason: ${strayDeclineReason.trim()}`,
          reportId: selectedStrayForDecline.id,
          reportType: 'stray',
          location: selectedStrayForDecline.locationName || 'Unknown location',
          declineReason: strayDeclineReason.trim(),
          read: false,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.email || 'impound_admin'
        });
      }

      toast.success('Stray report declined successfully');
      setShowStrayDeclineModal(false);
      setSelectedStrayForDecline(null);
      setStrayDeclineReason('');
    } catch (error) {
      console.error('Error declining stray report:', error);
      toast.error('Failed to decline stray report');
    }
  };

  // Adoption application helpers
  const openApplicationDetails = (app) => {
    setSelectedApplication(app);
    setShowAppModal(true);
  };

  const handleUpdateApplicationStatus = async (appId, status) => {
    try {
      await updateDoc(doc(db, 'adoption_applications', appId), {
        status,
        processedDate: serverTimestamp(),
        processedBy: currentUser?.email || 'impound_admin'
      });
      // Close modal if this application is currently selected
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
        processedDate: serverTimestamp(),
        processedBy: currentUser?.email || 'impound_admin',
      });
      // Close modal if this application is currently selected
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
        registrationStatus: 'registered', // Enable QR code and report lost functionality
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-800 to-slate-900 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-white hover:bg-slate-700 rounded-lg transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center p-1">
              <img src={LogoWhite} alt="PawSafety Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-white text-base font-semibold">Impound</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-[1rem] px-1 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-all"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-[60px]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden fixed top-[60px] left-0 right-0 z-50 bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl border-t border-slate-700 max-h-[calc(100vh-60px)] overflow-y-auto">
            <nav className="py-2">
              <button
                onClick={() => {
                  setActiveTab('analytics');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <BarChart3 className="h-5 w-5 mr-3" />
                Dashboard
              </button>
              
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Reports</div>
              
              <button
                onClick={() => {
                  setActiveTab('stray');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'stray'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <Search className="h-5 w-5 mr-3" />
                  Stray Reports
                </div>
                {(strayReports || []).length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {(strayReports || []).length > 99 ? '99+' : (strayReports || []).length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('lost');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'lost'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <ShieldCheck className="h-5 w-5 mr-3" />
                  Lost Pet Reports
                </div>
                {(lostReports || []).length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {(lostReports || []).length > 99 ? '99+' : (lostReports || []).length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('incident');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'incident'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3" />
                  Incident Reports
                </div>
                {(incidentReports || []).length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {(incidentReports || []).length > 99 ? '99+' : (incidentReports || []).length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('found');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'found'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 mr-3" />
                  Found Pet Reports
                </div>
                {(foundReports || []).length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {(foundReports || []).length > 99 ? '99+' : (foundReports || []).length}
                  </span>
                )}
              </button>
              
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase">Adoption</div>
              
              <button
                onClick={() => {
                  setActiveTab('adoption');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'adoption'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Heart className="h-5 w-5 mr-3" />
                Register Pet
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('adoptionList');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'adoptionList'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <List className="h-5 w-5 mr-3" />
                  Adoption List
                </div>
                {(adoptablePets || []).length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {(adoptablePets || []).length > 99 ? '99+' : (adoptablePets || []).length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  setActiveTab('applications');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'applications'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-l-4 border-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center">
                  <List className="h-5 w-5 mr-3" />
                  Applications
                </div>
                {(adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-[1.25rem] px-1.5 flex items-center justify-center">
                    {(adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length > 99 ? '99+' : (adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </>
      )}
      
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-50 transition-all duration-300 ${
          sidebarOpen || sidebarHovered ? 'w-80 translate-x-0' : 'w-16 -translate-x-0'
        } lg:${sidebarOpen || sidebarHovered ? 'w-80' : 'w-16'}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="h-full bg-gradient-to-b from-slate-800 to-slate-900 border-r border-slate-700 shadow-2xl flex flex-col">
          {/* Brand / Toggle */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                <img src={LogoWhite} alt="PawSafety Logo" className="w-full h-full object-contain" />
              </div>
              {(sidebarOpen || sidebarHovered) && (
                <span className="ml-3 text-white text-lg font-semibold">Impound</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700"
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? '‹' : '›'}
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="p-3 flex-1 space-y-3 overflow-y-auto">
            {/* Notifications (separate from title) */}
            <div className="mb-2">
              {(sidebarOpen || sidebarHovered) ? (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 relative"
                >
                  <Bell className="h-5 w-5 mr-2" />
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-full p-3 rounded-xl transition-all duration-300 relative text-slate-300 hover:text-white hover:bg-slate-700/50"
                  aria-label="Notifications"
                >
                  <Bell className="h-6 w-6 mx-auto" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[1rem] px-1 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>
            
            {/* Dashboard Button */}
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full p-3 rounded-xl transition-all duration-300 ${
                activeTab === 'analytics' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
              } flex items-center`}
            >
              <BarChart3 className="h-5 w-5" />
              {(sidebarOpen || sidebarHovered) && <span className="ml-3">Dashboard</span>}
            </button>

            {/* Reports Section */}
            <div className="space-y-1">
              {/* Reports Parent Button */}
              <button
                onClick={() => setReportsExpanded(!reportsExpanded)}
                className={`w-full p-3 rounded-xl transition-all duration-300 ${
                  ['stray', 'lost', 'incident', 'found'].includes(activeTab)
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
                } flex items-center justify-between`}
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5" />
                  {(sidebarOpen || sidebarHovered) && <span className="ml-3">Reports</span>}
                </div>
                {(sidebarOpen || sidebarHovered) && (
                  <svg 
                    className={`h-4 w-4 transition-transform duration-300 ${reportsExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Reports Sub-buttons */}
              {reportsExpanded && (sidebarOpen || sidebarHovered) && (
                <div className="ml-4 space-y-2 border-l-2 border-slate-600 pl-2">
                  {/* Stray Reports */}
                  <button
                    onClick={() => setActiveTab('stray')}
                    className={`w-full p-2.5 rounded-lg transition-all duration-300 ${
                      activeTab === 'stray' 
                        ? 'bg-slate-700 text-white shadow-md' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    } flex items-center text-sm`}
                  >
                    <Search className="h-4 w-4" />
                    <span className="ml-2 flex-1 text-left">Stray Reports</span>
                    {(strayReports || []).length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-red-500 text-white">
                        {(strayReports || []).length > 99 ? '99+' : (strayReports || []).length}
                      </span>
                    )}
                  </button>

                  {/* Lost Pet Reports */}
                  <button
                    onClick={() => setActiveTab('lost')}
                    className={`w-full p-2.5 rounded-lg transition-all duration-300 ${
                      activeTab === 'lost' 
                        ? 'bg-slate-700 text-white shadow-md' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    } flex items-center text-sm`}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="ml-2 flex-1 text-left">Lost Reports</span>
                    {(lostReports || []).length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-red-500 text-white">
                        {(lostReports || []).length > 99 ? '99+' : (lostReports || []).length}
                      </span>
                    )}
                  </button>

                  {/* Incident Reports */}
                  <button
                    onClick={() => setActiveTab('incident')}
                    className={`w-full p-2.5 rounded-lg transition-all duration-300 ${
                      activeTab === 'incident' 
                        ? 'bg-slate-700 text-white shadow-md' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    } flex items-center text-sm`}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="ml-2 flex-1 text-left">Incident Reports</span>
                    {(incidentReports || []).length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-red-500 text-white">
                        {(incidentReports || []).length > 99 ? '99+' : (incidentReports || []).length}
                      </span>
                    )}
                  </button>

                  {/* Found Pet Reports */}
                  <button
                    onClick={() => setActiveTab('found')}
                    className={`w-full p-2.5 rounded-lg transition-all duration-300 ${
                      activeTab === 'found' 
                        ? 'bg-slate-700 text-white shadow-md' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    } flex items-center text-sm`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="ml-2 flex-1 text-left">Found Reports</span>
                    {(foundReports || []).length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-red-500 text-white">
                        {(foundReports || []).length > 99 ? '99+' : (foundReports || []).length}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Adoption Section */}
            <div className="space-y-1">
              {/* Adoption Parent Button */}
              <button
                onClick={() => setAdoptionExpanded(!adoptionExpanded)}
                className={`w-full p-3 rounded-xl transition-all duration-300 ${
                  ['adoption', 'adoptionList', 'applications'].includes(activeTab)
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-gradient-to-br from-blue-50 to-purple-100 text-blue-700 border border-blue-200 hover:shadow'
                } flex items-center justify-between`}
              >
                <div className="flex items-center">
                  <Heart className="h-5 w-5" />
                  {(sidebarOpen || sidebarHovered) && <span className="ml-3">Adoption</span>}
                </div>
                {(sidebarOpen || sidebarHovered) && (
                  <svg
                    className={`h-4 w-4 transition-transform duration-300 ${adoptionExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Adoption Sub-buttons */}
              {adoptionExpanded && (sidebarOpen || sidebarHovered) && (
                <div className="ml-4 space-y-2 border-l-2 border-slate-600 pl-2">
                  {/* Register Pet */}
                  <button
                    onClick={() => setActiveTab('adoption')}
                    className={`w-full p-2.5 rounded-lg transition-all duration-300 ${
                      activeTab === 'adoption'
                        ? 'bg-slate-700 text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    } flex items-center text-sm`}
                  >
                    <Heart className="h-4 w-4" />
                    <span className="ml-2 flex-1 text-left">Register Pet</span>
                  </button>

                  {/* Adoption List */}
                  <button
                    onClick={() => setActiveTab('adoptionList')}
                    className={`w-full p-2.5 rounded-lg transition-all duration-300 ${
                      activeTab === 'adoptionList'
                        ? 'bg-slate-700 text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    } flex items-center text-sm`}
                  >
                    <List className="h-4 w-4" />
                    <span className="ml-2 flex-1 text-left">Adoption List</span>
                    {(adoptablePets || []).length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-red-500 text-white">
                        {(adoptablePets || []).length > 99 ? '99+' : (adoptablePets || []).length}
                      </span>
                    )}
                  </button>

                  {/* Applications */}
                  <button
                    onClick={() => setActiveTab('applications')}
                    className={`w-full p-2.5 rounded-lg transition-all duration-300 ${
                      activeTab === 'applications'
                        ? 'bg-slate-700 text-white shadow-md'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    } flex items-center text-sm`}
                  >
                    <List className="h-4 w-4" />
                    <span className="ml-2 flex-1 text-left">Applications</span>
                    {(adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs bg-red-500 text-white">
                        {(adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length > 99 ? '99+' : (adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </nav>
          {/* Logout pinned to bottom */}
          <div className="p-3 pt-0 mt-auto">
            {(sidebarOpen || sidebarHovered) ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all duration-300"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full p-3 rounded-xl transition-all duration-300 text-red-400 hover:text-red-300 hover:bg-red-600/20"
                aria-label="Logout"
              >
                <LogOut className="h-6 w-6 mx-auto" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Floating notifications panel (same as AgriculturalDashboard) */}
      {showNotifications && (
        <div className="fixed left-4 top-20 lg:left-20 lg:top-6 z-50 notifications-container max-w-[calc(100vw-2rem)] sm:max-w-md w-full sm:w-96">
          <div className="w-full bg-white rounded-lg shadow-xl border border-gray-200">
            <div className="p-3 sm:p-4 border-b border-gray-100 bg-gray-50 rounded-t-lg flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600 mr-2" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    handleDeleteAllNotifications();
                    setShowNotifications(false);
                  }}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors border border-red-200 hover:border-red-300 text-xs font-medium"
                  title="Delete all notifications"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete All</span>
                </button>
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.filter((notification) => 
                        (notification.status || '').toLowerCase() !== 'resolved' &&
                        (notification.status || '').toLowerCase() !== 'completed' &&
                        (notification.status || '').toLowerCase() !== 'declined'
                      ).length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">No notifications yet</p>
                          <p className="text-sm text-gray-400">New reports will appear here when submitted</p>
                        </div>
                      ) : (
                        notifications
                          .filter((notification) => 
                            (notification.status || '').toLowerCase() !== 'resolved' &&
                            (notification.status || '').toLowerCase() !== 'completed' &&
                            (notification.status || '').toLowerCase() !== 'declined'
                          )
                          .slice(0, 10)
                          .map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              !notification.impoundRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-green-600" />
                                  </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 truncate">{(notification.status || 'Report')} Report</p>
                          <div className="flex items-center space-x-2">
                          {!notification.impoundRead && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors border border-red-200 hover:border-red-300 text-xs font-medium"
                            title="Delete notification"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                          </div>
                                </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          <button 
                            onClick={() => openGoogleMaps(notification.location, notification.locationName)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            title="Click to open in Google Maps"
                          >
                            {notification.locationName || 'Unknown location'}
                          </button>
                        </p>
                                <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-400">{notification.reportTime?.toDate?.()?.toLocaleString() || 'Recently'}</p>
                          <button
                            onClick={(event) => handleNotificationClick(notification, event)}
                            className="text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
                          >
                            Click to view details →
                          </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className={`flex-1 py-3 px-3 sm:py-6 sm:px-6 transition-all duration-300 ${
        sidebarOpen || sidebarHovered ? 'lg:ml-80' : 'lg:ml-16'
      } pt-20 lg:pt-12`}>

        {activeTab === 'stray' && (
          <div className="bg-gradient-to-b from-orange-50 to-red-50 shadow-2xl rounded-xl p-4 sm:p-6 border border-orange-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Stray Reports
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {strayReports.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {r.imageUrl && !r.imageUrl.startsWith('file://') ? (
                    <ImageWithLoading
                      src={r.imageUrl}
                      alt="Stray Pet"
                      className="w-full h-40 object-cover"
                      imageId={`stray-${r.id}`}
                      fallbackContent={
                        <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                          <span className="text-slate-400 text-sm">No image</span>
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                      <span className="text-slate-400 text-sm">No image</span>
                    </div>
                  )}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2 line-clamp-3">
                      {r.description ? r.description.substring(0, 100) + (r.description.length > 100 ? '...' : '') : 'No description'}
                    </p>
                    <div className="flex items-center mb-1.5 sm:mb-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <button 
                        onClick={() => openGoogleMaps(r.location, r.locationName)}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline truncate cursor-pointer text-left"
                        title="Click to open in Google Maps"
                      >
                        {r.locationName || 'N/A'}
                      </button>
                </div>
                    <div className="flex items-center mb-2 sm:mb-3">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{r.contactNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full mt-auto">
                      <button onClick={() => openReportDetails(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors">View</button>
                      <button onClick={() => updateStrayStatus(r.id, 'Resolved')} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors">Resolve</button>
                      <button onClick={() => handleDeclineStray(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-red-600 text-white border-red-600 hover:bg-red-700 transition-colors">Decline</button>
                </div>
              </div>
                </div>
              ))}
              {strayReports.length === 0 && (
                <div className="col-span-full text-center text-sm text-orange-600 py-8">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  No stray reports at the moment
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'lost' && (
          <div className="bg-gradient-to-b from-indigo-50 to-purple-50 shadow-2xl rounded-xl p-4 sm:p-6 border border-indigo-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              Lost Pet Reports
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {lostReports.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {r.imageUrl && !r.imageUrl.startsWith('file://') ? (
                    <ImageWithLoading
                      src={r.imageUrl}
                      alt={r.petName || 'Pet'}
                      className="w-full h-40 object-cover"
                      imageId={`lost-${r.id}`}
                      fallbackContent={
                        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                          {r.imageUrl && r.imageUrl.startsWith('file://') ? 'Old Report' : 'No Image'}
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                      {r.imageUrl && r.imageUrl.startsWith('file://') ? 'Old Report' : 'No Image'}
                </div>
                  )}
                  <div className="p-3 sm:p-4 flex flex-col items-center text-center flex-1">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 truncate w-full mb-2">
                      {r.petName ? `${r.petName} (${r.breed || r.petType || 'Pet'})` : 'Unspecified pet'}
                    </p>
                    <div className="flex items-center mb-1.5 sm:mb-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <button 
                        onClick={() => openGoogleMaps(r.location, r.locationName)}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline truncate cursor-pointer text-left"
                        title="Click to open in Google Maps"
                      >
                        {r.locationName || 'N/A'}
                      </button>
                </div>
                    <div className="flex items-center mb-2 sm:mb-3">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{r.contactNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 w-full mt-auto">
                      <button onClick={() => openReportDetails(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="hidden sm:inline">View</span>
                      </button>
                      <button onClick={() => handlePrintLostReport(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span className="hidden sm:inline">Print</span>
                      </button>
                </div>
              </div>
                </div>
              ))}
              {lostReports.length === 0 && (
                <div className="col-span-full text-center text-sm text-indigo-600 py-8">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  No lost pet reports at the moment
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'incident' && (
          <div className="bg-gradient-to-b from-gray-50 to-gray-100 shadow-2xl rounded-xl p-4 sm:p-6 border border-gray-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-red-600 to-pink-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              Incident Reports
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {incidentReports.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {r.imageUrl && !r.imageUrl.startsWith('file://') ? (
                    <ImageWithLoading
                      src={r.imageUrl}
                      alt="Incident"
                      className="w-full h-40 object-cover"
                      imageId={`incident-${r.id}`}
                      fallbackContent={
                        <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                          <span className="text-slate-400 text-sm">No image</span>
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                      <span className="text-slate-400 text-sm">No image</span>
                    </div>
                  )}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 mb-2 line-clamp-3">
                      {r.description ? r.description.substring(0, 100) + (r.description.length > 100 ? '...' : '') : 'No description'}
                    </p>
                    <div className="flex items-center mb-1">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <button 
                        onClick={() => openGoogleMaps(r.location, r.locationName)}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline truncate cursor-pointer text-left"
                        title="Click to open in Google Maps"
                      >
                        {r.locationName || 'N/A'}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{r.contactNumber || 'N/A'}</p>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full mt-auto">
                      <button onClick={() => openReportDetails(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors">View</button>
                      <button onClick={() => handleResolveIncident(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors">Resolve</button>
                      <button onClick={() => handleDeclineIncident(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-red-600 text-white border-red-600 hover:bg-red-700 transition-colors">Decline</button>
                </div>
              </div>
                </div>
              ))}
              {incidentReports.length === 0 && (
                <div className="col-span-full text-center text-sm text-red-600 py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  No incident reports at the moment
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'found' && (
          <div className="bg-gradient-to-b from-green-50 to-emerald-50 shadow-2xl rounded-xl p-4 sm:p-6 border border-green-200">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4 flex items-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center mr-2 sm:mr-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Found Pet Reports
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {foundReports.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {r.imageUrl && !r.imageUrl.startsWith('file://') ? (
                    <ImageWithLoading
                      src={r.imageUrl}
                      alt={r.petName || 'Found Pet'}
                      className="w-full h-40 object-cover"
                      imageId={`found-${r.id}`}
                      fallbackContent={
                        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                          {r.imageUrl && r.imageUrl.startsWith('file://') ? 'Old Report' : 'No Image'}
                        </div>
                      }
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                      {r.imageUrl && r.imageUrl.startsWith('file://') ? 'Old Report' : 'No Image'}
                    </div>
                  )}
                  <div className="p-3 sm:p-4 flex flex-col items-center text-center flex-1">
                    <p className="text-sm sm:text-base font-semibold text-gray-900 truncate w-full mb-2">
                      {r.petName ? `${r.petName} (${r.breed || r.petType || 'Pet'})` : (r.breed || r.petType || 'Found pet')}
                    </p>
                    <div className="flex items-center mb-1.5 sm:mb-2">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <button 
                        onClick={() => openGoogleMaps(r.location, r.locationName)}
                        className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline truncate cursor-pointer text-left"
                        title="Click to open in Google Maps"
                      >
                        {r.locationName || 'N/A'}
                      </button>
                    </div>
                    <div className="flex items-center mb-2 sm:mb-3">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{r.contactNumber || 'N/A'}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 sm:gap-2 w-full mt-auto">
                      <button onClick={() => openReportDetails(r)} className="px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm rounded-md border font-medium bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>View Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {foundReports.length === 0 && (
                <div className="col-span-full text-center text-sm text-green-600 py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  No found pet reports at the moment
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'adoption' && (
          <div className="bg-gradient-to-b from-emerald-50 to-teal-50 shadow-2xl rounded-xl p-6 border border-emerald-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              Post Adoptable Pet
            </h2>
            <AdoptionForm
              adoptionForm={adoptionForm}
              setAdoptionForm={setAdoptionForm}
              submittingAdoption={submittingAdoption}
              onSubmit={handleAdoptionSubmit}
            />
                </div>
        )}

        {activeTab === 'adoptionList' && (
          <div className="bg-gradient-to-b from-emerald-50 to-teal-50 shadow-2xl rounded-xl p-6 border border-emerald-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              Adoptable Pets
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {adoptablePets.map((p) => (
                <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white flex flex-col h-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  {p.imageUrl ? (
                    <ImageWithLoading
                      src={p.imageUrl}
                      alt={p.petName || 'Pet'}
                      className="w-full h-40 object-cover"
                      imageId={`adoptable-${p.id}`}
                      fallbackContent={
                        <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                      }
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  <div className="p-4 flex flex-col items-center text-center flex-1">
                    <p className="text-base font-semibold text-gray-900 truncate w-full">{p.petName || 'Unnamed Pet'}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 w-full">
                      <button onClick={() => { setSelectedAdoptable(p); setShowTransferModal(true); fetchRegisteredUsers(); }} className="px-3 py-2 text-sm rounded-md border font-medium bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors">Transfer</button>
                      <button onClick={() => { setEditingAdoptable(p); setShowEditAdoptableModal(true); }} className="px-3 py-2 text-sm rounded-md border font-medium bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors">Edit</button>
                      <button onClick={async () => { if (window.confirm('Delete this pet?')) { await deleteDoc(doc(db, 'adoptable_pets', p.id)); toast.success('Deleted'); } }} className="px-3 py-2 text-sm rounded-md border font-medium bg-red-600 text-white border-red-600 hover:bg-red-700 transition-colors">Delete</button>
                </div>
              </div>
            </div>
              ))}
              {adoptablePets.length === 0 && (
                <div className="col-span-full text-center text-sm text-emerald-600 py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  No adoptable pets at the moment
                </div>
              )}
          </div>
        </div>
        )}

        

        {activeTab === 'applications' && (
          <div className="bg-gradient-to-b from-purple-50 to-pink-50 shadow-2xl rounded-xl p-6 border border-purple-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              Adoption Applications
            </h2>
            
            {/* Application Sub-tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveApplicationTab('pending')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeApplicationTab === 'pending'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pending Applications
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {(adoptionApplications || []).filter(a => (a.status || 'Submitted') === 'Submitted').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveApplicationTab('approved')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeApplicationTab === 'approved'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Approved Applications
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {(adoptionApplications || []).filter(a => a.status === 'Approved').length}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveApplicationTab('declined')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeApplicationTab === 'declined'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Declined Applications
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {(adoptionApplications || []).filter(a => a.status === 'Declined').length}
                    </span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Application Content */}
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {adoptionApplications
                .filter(a => {
                  if (activeApplicationTab === 'pending') return (a.status || 'Submitted') === 'Submitted';
                  if (activeApplicationTab === 'approved') return a.status === 'Approved';
                  if (activeApplicationTab === 'declined') return a.status === 'Declined';
                  return false;
                })
                .map((a) => (
                  <div key={a.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {a.applicant?.fullName || 'Unknown'}
                        </h3>
                        <p className="text-xs text-gray-600 truncate mt-0.5">{a.petName || a.petBreed || 'Pet'}</p>
                      </div>
                      <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                        a.status === 'Approved' 
                          ? 'bg-green-100 text-green-800'
                          : a.status === 'Declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {a.status || 'Submitted'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Preferred Date:</span>
                        <span className="text-gray-900 text-right">{a.preferredDate || 'N/A'}</span>
                      </div>
                      {activeApplicationTab !== 'pending' && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 font-medium">
                            {activeApplicationTab === 'approved' ? 'Date Approved:' : 'Date Processed:'}
                          </span>
                          <span className="text-gray-900 text-right">
                            {a.processedDate ? new Date(a.processedDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => openApplicationDetails(a)}
                        className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                      >
                        View
                      </button>
                      {activeApplicationTab === 'pending' && (
                        <>
                          <button
                            onClick={() => handleUpdateApplicationStatus(a.id, 'Approved')}
                            className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-md transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDeclineApplication(a)}
                            className="flex-1 min-w-[70px] flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              {adoptionApplications.filter(a => {
                if (activeApplicationTab === 'pending') return (a.status || 'Submitted') === 'Submitted';
                if (activeApplicationTab === 'approved') return a.status === 'Approved';
                if (activeApplicationTab === 'declined') return a.status === 'Declined';
                return false;
              }).length === 0 && (
                <div className="text-center py-8 text-sm text-purple-600 bg-white rounded-lg border border-gray-200">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    No {activeApplicationTab} applications found
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden ring-1 ring-gray-200 ring-opacity-5 rounded-md bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preferred Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    {activeApplicationTab !== 'pending' && (
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {activeApplicationTab === 'approved' ? 'Date Approved' : 'Date Processed'}
                      </th>
                    )}
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adoptionApplications
                    .filter(a => {
                      if (activeApplicationTab === 'pending') return (a.status || 'Submitted') === 'Submitted';
                      if (activeApplicationTab === 'approved') return a.status === 'Approved';
                      if (activeApplicationTab === 'declined') return a.status === 'Declined';
                      return false;
                    })
                    .map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{a.applicant?.fullName || 'Unknown'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.petName || a.petBreed || 'Pet'}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{a.preferredDate || 'N/A'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          a.status === 'Approved' 
                            ? 'bg-green-100 text-green-800'
                            : a.status === 'Declined'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {a.status || 'Submitted'}
                        </span>
                      </td>
                      {activeApplicationTab !== 'pending' && (
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {a.processedDate ? new Date(a.processedDate.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </td>
                      )}
                      <td className="px-4 py-2 text-right text-sm">
                        <div className="inline-flex flex-wrap gap-2">
                          <button onClick={() => openApplicationDetails(a)} className="px-2 py-1 text-xs rounded border bg-blue-600 text-white border-blue-600 hover:bg-blue-700 transition-colors">View</button>
                          {activeApplicationTab === 'pending' && (
                            <>
                              <button onClick={() => handleUpdateApplicationStatus(a.id, 'Approved')} className="px-2 py-1 text-xs rounded border bg-green-600 text-white border-green-600 hover:bg-green-700 transition-colors">Approve</button>
                              <button onClick={() => handleDeclineApplication(a)} className="px-2 py-1 text-xs rounded border bg-red-600 text-white border-red-600 hover:bg-red-700 transition-colors">Decline</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {adoptionApplications.filter(a => {
                    if (activeApplicationTab === 'pending') return (a.status || 'Submitted') === 'Submitted';
                    if (activeApplicationTab === 'approved') return a.status === 'Approved';
                    if (activeApplicationTab === 'declined') return a.status === 'Declined';
                    return false;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={activeApplicationTab === 'pending' ? 5 : 6} className="px-4 py-6 text-center text-sm text-purple-600">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                            <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        No {activeApplicationTab} applications found
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {activeTab === 'analytics' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                </div>
                  <div className="ml-3 sm:ml-4">
                        <p className="text-xs sm:text-sm font-medium text-blue-600">Total Reports</p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{dbTotals.totalReports}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
              </div>
            </div>
          </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Search className="h-6 w-6 text-white" />
                        </div>
                </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Stray Reports</p>
                        <p className="text-2xl font-bold text-gray-900">{dbTotals.strayReports}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
            </div>
          </div>
        </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Lost Pet Reports</p>
                        <p className="text-2xl font-bold text-gray-900">{dbTotals.lostReports}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
              </div>
            </div>
          </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <FileText className="h-6 w-6 text-white" />
                        </div>
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Incident Reports</p>
                        <p className="text-2xl font-bold text-gray-900">{dbTotals.incidentReports}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
              </div>
            </div>
          </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        </div>
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Found Pet Reports</p>
                        <p className="text-2xl font-bold text-gray-900">{dbTotals.foundReports}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
              </div>
            </div>
          </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <Heart className="h-6 w-6 text-white" />
                        </div>
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Adoption Applications</p>
                        <p className="text-2xl font-bold text-gray-900">{dbTotals.adoptionApplications}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
              </div>
            </div>
          </div>

              <div className="bg-gradient-to-br from-blue-50 to-purple-100 border border-blue-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-white" />
                        </div>
                  </div>
                  <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Adopted Pets</p>
                        <p className="text-2xl font-bold text-gray-900">{dbTotals.adoptedPets}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
        </div>



            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Adopted Pets Line Chart */}
              <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-xl shadow-lg p-6 border border-emerald-200">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  Adopted Pets Trend
                </h3>
                <div className="h-64">
                  <svg width="100%" height="100%" viewBox="0 0 400 200" className="overflow-visible">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="adoptedGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                      <linearGradient id="adoptedChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1"/>
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#adoptedGrid)" />
                    
                    {/* Chart area fill */}
                    <path
                      d={generateChartAreaPath(chartData, Math.max(...chartData.map(d => d.count), 1))}
                      fill="url(#adoptedChartGradient)"
                    />
                    
                    {/* Chart line */}
                    <path
                      d={generateChartPath(chartData, Math.max(...chartData.map(d => d.count), 1))}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                    />
                    
                    {/* Data points */}
                    {chartData.map((data, index) => {
                      const maxValue = Math.max(...chartData.map(d => d.count), 1);
                      const x = 20 + (index * 80);
                      const y = 180 - Math.min((data.count / maxValue) * 160, 160);
                      return (
                        <circle 
                          key={index}
                          cx={x} 
                          cy={y} 
                          r="6" 
                          fill="#ffffff" 
                          stroke="#10b981" 
                          strokeWidth="3" 
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                        />
                      );
                    })}
                    
                    {/* Labels */}
                    {chartData.map((data, index) => (
                      <text 
                        key={index}
                        x={20 + (index * 80)} 
                        y="195" 
                        textAnchor="middle" 
                        className="text-xs fill-white"
                      >
                        {data.month}
                      </text>
                    ))}
                    
                    {/* Y-axis labels */}
                    <text x="10" y="185" textAnchor="end" className="text-xs fill-white">0</text>
                    <text x="10" y="145" textAnchor="end" className="text-xs fill-white">20</text>
                    <text x="10" y="105" textAnchor="end" className="text-xs fill-white">40</text>
                    <text x="10" y="65" textAnchor="end" className="text-xs fill-white">60</text>
                    <text x="10" y="25" textAnchor="end" className="text-xs fill-white">80</text>
                  </svg>
                  </div>
                <div className="mt-4 flex justify-between text-sm text-white">
                  <span>Total Adopted: {dbTotals.adoptedPets}</span>
                  <div className="flex items-center space-x-2">
                    <span>Growth: {calculateAdoptedPetsGrowth(chartData) >= 0 ? '+' : ''}{calculateAdoptedPetsGrowth(chartData)}% this month</span>
                    {isDataLoading && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                </div>
                </div>
              </div>

              {/* Stray Reports Line Chart */}
              <div className="bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 rounded-xl shadow-lg p-6 border border-orange-200">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                  Stray Reports Trend
                </h3>
                <div className="h-64">
                  <svg width="100%" height="100%" viewBox="0 0 400 200" className="overflow-visible">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="strayGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
                      </pattern>
                      <linearGradient id="strayChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#ec4899" stopOpacity="0.1"/>
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#strayGrid)" />
                    
                    {/* Chart area fill */}
                    <path
                      d={generateChartAreaPath(strayChartData, Math.max(...strayChartData.map(d => d.count), 1))}
                      fill="url(#strayChartGradient)"
                    />
                    
                    {/* Chart line */}
                    <path
                      d={generateChartPath(strayChartData, Math.max(...strayChartData.map(d => d.count), 1))}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                    />
                    
                    {/* Data points */}
                    {strayChartData.map((data, index) => {
                      const maxValue = Math.max(...strayChartData.map(d => d.count), 1);
                      const x = 20 + (index * 80);
                      const y = 180 - Math.min((data.count / maxValue) * 160, 160);
                      return (
                        <circle 
                          key={index}
                          cx={x} 
                          cy={y} 
                          r="6" 
                          fill="#ffffff" 
                          stroke="#f97316" 
                          strokeWidth="3" 
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                        />
                      );
                    })}
                    
                    {/* Labels */}
                    {strayChartData.map((data, index) => (
                      <text 
                        key={index}
                        x={20 + (index * 80)} 
                        y="195" 
                        textAnchor="middle" 
                        className="text-xs fill-white"
                      >
                        {data.month}
                      </text>
                    ))}
                    
                    {/* Y-axis labels */}
                    <text x="10" y="185" textAnchor="end" className="text-xs fill-white">0</text>
                    <text x="10" y="145" textAnchor="end" className="text-xs fill-white">20</text>
                    <text x="10" y="105" textAnchor="end" className="text-xs fill-white">40</text>
                    <text x="10" y="65" textAnchor="end" className="text-xs fill-white">60</text>
                    <text x="10" y="25" textAnchor="end" className="text-xs fill-white">80</text>
                  </svg>
              </div>
                <div className="mt-4 flex justify-between text-sm text-white">
                  <span>Total Reports: {dbTotals.strayReports}</span>
                  <div className="flex items-center space-x-2">
                    <span>Growth: {calculateStrayReportsGrowth(strayChartData) >= 0 ? '+' : ''}{calculateStrayReportsGrowth(strayChartData)}% this month</span>
                    {isDataLoading && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
              </div>
            </div>
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
                    <ImageWithLoading
                      src={selectedAdoptable.imageUrl}
                      alt="pet"
                      className="w-full h-56 object-cover"
                      imageId={`adoptable-modal-${selectedAdoptable.id}`}
                      fallbackContent={
                        <div className="w-full h-56 bg-gray-100 flex items-center justify-center text-gray-400">No Image</div>
                      }
                    />
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
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowReportModal(false)}
          />
          {/* Modal */}
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-[60] border border-gray-200 overflow-hidden"
            data-report-detail-modal
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    <FileText className="h-6 w-6" />
              </div>
                  <div>
                    <h2 className="text-xl font-bold">Report Details</h2>
                    <p className="text-blue-100 text-sm">
                      {(selectedReport.status || 'Report')} Report
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">

                {/* Reporter's Input Details */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reporter's Input Details</label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    {/* Report Image */}
                    {selectedReport.imageUrl && !selectedReport.imageUrl.startsWith('file://') ? (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Report Image</label>
                        <div className="relative">
                          <img 
                            src={selectedReport.imageUrl} 
                            alt="Report Image"
                            className="w-full h-64 object-cover rounded-lg border"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const placeholder = e.target.nextElementSibling;
                              if (placeholder) {
                                placeholder.style.display = 'flex';
                              }
                            }}
                          />
                          <div className="image-placeholder w-full h-64 bg-gray-100 rounded-lg border items-center justify-center" style={{display: 'none'}}>
                            <div className="text-center">
                              <svg className="h-16 w-16 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <p className="text-gray-500 text-sm">Failed to load report image</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Report Details */}
                      <div className="space-y-3">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Report Information</h4>
                        <div>
                          <span className="text-sm text-gray-600">Report Type:</span>
                          <p className="text-gray-900 font-medium">{(selectedReport.status || 'Report').charAt(0).toUpperCase() + (selectedReport.status || 'Report').slice(1)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Location:</span>
                          <button 
                            onClick={() => openGoogleMaps(selectedReport.location, selectedReport.locationName)}
                            className="text-gray-900 font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            title="Click to open in Google Maps"
                          >
                            {selectedReport.locationName || 'Not provided'}
                          </button>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Report Date:</span>
                          <p className="text-gray-900 font-medium">
                            {selectedReport.reportTime?.toDate ? selectedReport.reportTime.toDate().toLocaleString() : 'Not available'}
                          </p>
                        </div>
                        {selectedReport.description && (
                          <div>
                            <span className="text-sm text-gray-600">Description:</span>
                            <p className="text-gray-900 font-medium whitespace-pre-wrap">{selectedReport.description}</p>
                          </div>
                        )}
                      </div>

                      {/* Pet Owner Information (for Lost reports) */}
                      {selectedReport.status === 'Lost' && (selectedReport.ownerName || selectedReport.contactNumber || selectedReport.petName) && (
                        <div className="space-y-3">
                          <h4 className="text-md font-semibold text-gray-800 mb-3">Pet Owner Information</h4>
                          {selectedReport.ownerName && (
                            <div>
                              <span className="text-sm text-gray-600">Owner Name:</span>
                              <p className="text-gray-900 font-medium">{selectedReport.ownerName}</p>
                            </div>
                          )}
                          {selectedReport.contactNumber && (
                            <div>
                              <span className="text-sm text-gray-600">Contact Number:</span>
                              <p className="text-gray-900 font-medium">{selectedReport.contactNumber}</p>
                            </div>
                          )}
                          {selectedReport.petName && (
                            <div>
                              <span className="text-sm text-gray-600">Pet Name:</span>
                              <p className="text-gray-900 font-medium">{selectedReport.petName}</p>
                            </div>
                          )}
                          {selectedReport.breed && (
                            <div>
                              <span className="text-sm text-gray-600">Breed:</span>
                              <p className="text-gray-900 font-medium">{selectedReport.breed}</p>
                            </div>
                          )}
                          {selectedReport.petType && (
                            <div>
                              <span className="text-sm text-gray-600">Pet Type:</span>
                              <p className="text-gray-900 font-medium">
                                {selectedReport.petType.charAt(0).toUpperCase() + selectedReport.petType.slice(1)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Report Information</h4>
                      <p className="text-sm text-blue-700">
                        This report has been submitted and is awaiting review. You can take action on this report from the main dashboard.
                      </p>
              </div>
            </div>
          </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modern Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Adoption Application</h3>
                    <p className="text-indigo-100 text-sm">{selectedApplication.petName || selectedApplication.petBreed || 'Pet'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    (selectedApplication.status || 'Submitted') === 'Approved' ? 'bg-green-500 text-white' :
                    (selectedApplication.status || 'Submitted') === 'Declined' ? 'bg-red-500 text-white' :
                    'bg-yellow-500 text-white'
                }`}>
                  {selectedApplication.status || 'Submitted'}
                  </span>
                  <button 
                    onClick={() => setSelectedApplication(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
                </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Applicant & Pet Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
              </div>
                      <h4 className="text-lg font-semibold text-gray-900">Applicant Information</h4>
            </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Full Name</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedApplication.applicant?.fullName || 'N/A'}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Phone</p>
                          <a href={`tel:${selectedApplication.applicant?.phone || ''}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {selectedApplication.applicant?.phone || 'N/A'}
                          </a>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Email</p>
                          <a href={`mailto:${selectedApplication.applicant?.email || ''}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {selectedApplication.applicant?.email || 'N/A'}
                          </a>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Address</p>
                        <p className="text-gray-900">{selectedApplication.applicant?.address || 'No address provided'}</p>
                      </div>
          </div>
        </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                  </div>
                      <h4 className="text-lg font-semibold text-gray-900">Pet Information</h4>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pet Name</p>
                        <p className="text-lg font-semibold text-gray-900">{selectedApplication.petName || selectedApplication.petBreed || 'Pet'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Preferred Adoption Date</p>
                        <p className="text-gray-900 font-medium">{selectedApplication.preferredDate || 'N/A'}</p>
                      </div>
                    </div>
                          </div>
                        </div>

                {/* Household & Residence */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                  </div>
                      <h4 className="text-lg font-semibold text-gray-900">Household</h4>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Adults:</span>
                        <span className="font-semibold text-gray-900">{selectedApplication.household?.adults || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Children:</span>
                        <span className="font-semibold text-gray-900">{selectedApplication.household?.children || '0'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-5 border border-orange-100">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                  </div>
                      <h4 className="text-lg font-semibold text-gray-900">Residence</h4>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold text-gray-900">{selectedApplication.household?.residenceType || 'N/A'}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Landlord Approval:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedApplication.household?.landlordApproval 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedApplication.household?.landlordApproval ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                {(selectedApplication.experience || selectedApplication.currentPets || selectedApplication.lifestyle) && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Additional Information
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {selectedApplication.experience && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <h5 className="font-semibold text-gray-900 mb-2">Experience</h5>
                          <p className="text-gray-700 text-sm leading-relaxed">{selectedApplication.experience}</p>
                      </div>
                      )}
                      
                      {selectedApplication.currentPets && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                          <h5 className="font-semibold text-gray-900 mb-2">Current Pets</h5>
                          <p className="text-gray-700 text-sm leading-relaxed">{selectedApplication.currentPets}</p>
                  </div>
                      )}
                      
                      {selectedApplication.lifestyle && (
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 lg:col-span-2">
                          <h5 className="font-semibold text-gray-900 mb-2">Lifestyle</h5>
                          <p className="text-gray-700 text-sm leading-relaxed">{selectedApplication.lifestyle}</p>
                </div>
                      )}
              </div>
                  </div>
                )}

                {/* Vet & References */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-100">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                </div>
                      <h4 className="text-lg font-semibold text-gray-900">Veterinarian</h4>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-semibold text-gray-900">{selectedApplication.vet?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-semibold text-gray-900">{selectedApplication.vet?.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {selectedApplication.references && (
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900">References</h4>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{selectedApplication.references}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modern Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-gray-600">
                  Application submitted on {selectedApplication.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                </div>
                <div className="flex flex-wrap gap-3">
              {(selectedApplication.status || 'Submitted') === 'Submitted' && (
                <>
                      <button 
                        onClick={() => handleUpdateApplicationStatus(selectedApplication.id, 'Approved')} 
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Approve</span>
                      </button>
                      <button 
                        onClick={() => handleDeclineApplication(selectedApplication)} 
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Decline</span>
                      </button>
                </>
              )}
                  <button 
                    onClick={() => setSelectedApplication(null)} 
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Close</span>
                  </button>
                </div>
              </div>
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

      {/* Decline Incident Report Modal */}
      {showDeclineModal && selectedIncidentForDecline && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Decline Incident Report</h3>
              <button 
                onClick={() => {
                  setShowDeclineModal(false);
                  setSelectedIncidentForDecline(null);
                  setDeclineReason('');
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Please provide a reason for declining this incident report:
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  <strong>Location:</strong> 
                  <button 
                    onClick={() => openGoogleMaps(selectedIncidentForDecline.location, selectedIncidentForDecline.locationName)}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                    title="Click to open in Google Maps"
                  >
                    {selectedIncidentForDecline.locationName || 'N/A'}
                  </button>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  <strong>Description:</strong> {selectedIncidentForDecline.description ? 
                    (selectedIncidentForDecline.description.length > 100 ? 
                      selectedIncidentForDecline.description.substring(0, 100) + '...' : 
                      selectedIncidentForDecline.description) : 'No description'}
                </p>
              </div>
              <div>
                <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Decline *
                </label>
                <textarea
                  id="declineReason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please explain why this incident report is being declined..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={4}
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowDeclineModal(false);
                  setSelectedIncidentForDecline(null);
                  setDeclineReason('');
                }} 
                className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDeclineIncident}
                className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Decline Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Stray Report Modal */}
      {showStrayDeclineModal && selectedStrayForDecline && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Decline Stray Report</h3>
              <button 
                onClick={() => {
                  setShowStrayDeclineModal(false);
                  setSelectedStrayForDecline(null);
                  setStrayDeclineReason('');
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Please provide a reason for declining this stray report:
                </p>
                <p className="text-sm text-gray-500 mb-3">
                  <strong>Location:</strong> 
                  <button 
                    onClick={() => openGoogleMaps(selectedStrayForDecline.location, selectedStrayForDecline.locationName)}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                    title="Click to open in Google Maps"
                  >
                    {selectedStrayForDecline.locationName || 'N/A'}
                  </button>
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  <strong>Description:</strong> {selectedStrayForDecline.description ? 
                    (selectedStrayForDecline.description.length > 100 ? 
                      selectedStrayForDecline.description.substring(0, 100) + '...' : 
                      selectedStrayForDecline.description) : 'No description'}
                </p>
              </div>
              <div>
                <label htmlFor="strayDeclineReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Decline *
                </label>
                <textarea
                  id="strayDeclineReason"
                  value={strayDeclineReason}
                  onChange={(e) => setStrayDeclineReason(e.target.value)}
                  placeholder="Please explain why this stray report is being declined..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  rows={4}
                  required
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end space-x-3">
              <button 
                onClick={() => {
                  setShowStrayDeclineModal(false);
                  setSelectedStrayForDecline(null);
                  setStrayDeclineReason('');
                }} 
                className="px-4 py-2 rounded-md text-sm font-medium bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDeclineStray}
                className="px-4 py-2 rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700"
              >
                Decline Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Detail Modal */}
      {showNotificationModal && selectedNotification && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => {
              setShowNotificationModal(false);
              setSelectedNotification(null);
              // Don't close the notification modal - keep it open
            }}
          />
          {/* Modal */}
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl z-[60] border border-gray-200 overflow-hidden"
            data-notification-detail-modal
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mr-4">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Report Details</h2>
                    <p className="text-blue-100 text-sm">
                      {(selectedNotification.status || 'Report')} Report
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedNotification(null);
                    // Don't close the notification modal - keep it open
                  }}
                  className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">

                {/* Reporter's Input Details */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Reporter's Input Details</label>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    {/* Report Image */}
                    {selectedNotification.imageUrl && !selectedNotification.imageUrl.startsWith('file://') && (
                      <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Report Image</label>
                        <div className="relative">
                          <img 
                            src={selectedNotification.imageUrl} 
                            alt="Report Image" 
                            className="w-full h-64 object-cover rounded-lg border"
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Report Details */}
                      <div className="space-y-3">
                        <h4 className="text-md font-semibold text-gray-800 mb-3">Report Information</h4>
                        <div>
                          <span className="text-sm text-gray-600">Report Type:</span>
                          <p className="text-gray-900 font-medium">
                            {(selectedNotification.status || 'Report').charAt(0).toUpperCase() + (selectedNotification.status || 'Report').slice(1)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Location:</span>
                          <p className="text-gray-900 font-medium">
                            <button 
                              onClick={() => openGoogleMaps(selectedNotification.location, selectedNotification.locationName)}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Click to open in Google Maps"
                            >
                              {selectedNotification.locationName || 'Not provided'}
                            </button>
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Report Date:</span>
                          <p className="text-gray-900 font-medium">
                            {selectedNotification.reportTime?.toDate?.()?.toLocaleString() || 'Recently'}
                          </p>
                        </div>
                        {selectedNotification.contactNumber && (
                          <div>
                            <span className="text-sm text-gray-600">Contact Number:</span>
                            <p className="text-gray-900 font-medium">{selectedNotification.contactNumber}</p>
                          </div>
                        )}
                        {selectedNotification.description && (
                          <div>
                            <span className="text-sm text-gray-600">Description:</span>
                            <p className="text-gray-900 font-medium whitespace-pre-wrap">{selectedNotification.description}</p>
                          </div>
                        )}
                      </div>

                      {/* Pet Details (if available for Lost reports) */}
                      {(selectedNotification.petName || selectedNotification.breed || selectedNotification.petType) && (
                        <div className="space-y-3">
                          <h4 className="text-md font-semibold text-gray-800 mb-3">Pet Information</h4>
                          {selectedNotification.petName && (
                            <div>
                              <span className="text-sm text-gray-600">Pet Name:</span>
                              <p className="text-gray-900 font-medium">{selectedNotification.petName}</p>
                            </div>
                          )}
                          {selectedNotification.breed && (
                            <div>
                              <span className="text-sm text-gray-600">Breed:</span>
                              <p className="text-gray-900 font-medium">{selectedNotification.breed}</p>
                            </div>
                          )}
                          {selectedNotification.petType && (
                            <div>
                              <span className="text-sm text-gray-600">Pet Type:</span>
                              <p className="text-gray-900 font-medium">
                                {selectedNotification.petType.charAt(0).toUpperCase() + selectedNotification.petType.slice(1)}
                              </p>
                            </div>
                          )}
                          {selectedNotification.ownerName && (
                            <div>
                              <span className="text-sm text-gray-600">Owner Name:</span>
                              <p className="text-gray-900 font-medium">{selectedNotification.ownerName}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-blue-600 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">Report Information</h4>
                      <p className="text-sm text-blue-700">
                        This report has been submitted and is awaiting review. You can take action on this report from the main dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    setSelectedNotification(null);
                    // Don't close the notification modal - keep it open
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ImpoundDashboard; 