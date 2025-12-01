/**
 * Script to populate Firebase with test registered pets data
 * 
 * Usage:
 * 1. Make sure you have Firebase Admin SDK or use this in your dashboard component
 * 2. Update the dates to spread across the last 6 months
 * 3. Run this script or copy the data structure to manually add in Firebase Console
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust path as needed

// Sample pet data with dates spread across last 6 months
const generateTestPets = () => {
  const now = new Date();
  const pets = [];
  
  // Pet names and breeds for variety
  const petNames = [
    'Max', 'Bella', 'Charlie', 'Luna', 'Cooper', 'Daisy', 'Milo', 'Lucy',
    'Rocky', 'Sadie', 'Buddy', 'Molly', 'Bear', 'Lola', 'Duke', 'Sophie',
    'Jack', 'Maggie', 'Toby', 'Chloe', 'Oscar', 'Penny', 'Zeus', 'Lily',
    'Bruno', 'Nala', 'Jax', 'Ruby', 'Leo', 'Zoey', 'Rex', 'Mia', 'Finn',
    'Ellie', 'Gus', 'Rosie', 'Bentley', 'Stella', 'Tucker', 'Willow'
  ];
  
  const dogBreeds = [
    'Aspin (Mixed Breed)', 'Golden Retriever', 'Labrador', 'German Shepherd',
    'Bulldog', 'Beagle', 'Poodle', 'Rottweiler', 'Yorkshire Terrier', 'Dachshund'
  ];
  
  const catBreeds = [
    'Puspin (Mixed Breed)', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair',
    'Ragdoll', 'Bengal', 'Scottish Fold', 'American Shorthair', 'Russian Blue'
  ];
  
  const genders = ['male', 'female'];
  const statuses = ['safe', 'healthy'];
  
  // Generate pets for each of the last 6 months
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    
    // Generate 3-8 pets per month (randomized)
    const petsThisMonth = Math.floor(Math.random() * 6) + 3;
    
    for (let i = 0; i < petsThisMonth; i++) {
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const petDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      const petType = Math.random() > 0.5 ? 'dog' : 'cat';
      const breed = petType === 'dog' 
        ? dogBreeds[Math.floor(Math.random() * dogBreeds.length)]
        : catBreeds[Math.floor(Math.random() * catBreeds.length)];
      
      const pet = {
        petName: petNames[Math.floor(Math.random() * petNames.length)] + ` ${i + 1}`,
        petType: petType,
        breed: breed,
        petGender: genders[Math.floor(Math.random() * genders.length)],
        ownerFullName: `Owner ${Math.floor(Math.random() * 100)}`,
        contactNumber: `09${Math.floor(Math.random() * 100000000)}`,
        description: `A friendly ${petType} looking for a loving home.`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        registrationStatus: 'registered', // IMPORTANT: Must be 'registered' for chart
        archived: false,
        vaccinated: Math.random() > 0.3,
        dewormed: Math.random() > 0.4,
        antiRabies: Math.random() > 0.3,
        healthStatus: 'healthy',
        // Use registeredAt for the chart date
        registeredAt: petDate,
        createdAt: petDate, // Fallback date
        registeredDate: petDate.toISOString(),
        registeredBy: 'test_data_script',
        userId: `test_user_${Math.floor(Math.random() * 1000)}`, // You may want to use real user IDs
        petImage: '', // Optional: Add image URLs if you have them
        petBooklet: '' // Optional: Add booklet URLs if you have them
      };
      
      pets.push(pet);
    }
  }
  
  return pets;
};

// Function to populate database
export const populateTestPets = async () => {
  try {
    const testPets = generateTestPets();
    console.log(`Generating ${testPets.length} test pets...`);
    
    const results = [];
    for (const pet of testPets) {
      try {
        const docRef = await addDoc(collection(db, 'pets'), pet);
        results.push({ success: true, id: docRef.id, name: pet.petName });
        console.log(`✓ Added: ${pet.petName} (${pet.petType})`);
      } catch (error) {
        console.error(`✗ Failed to add ${pet.petName}:`, error);
        results.push({ success: false, name: pet.petName, error: error.message });
      }
    }
    
    console.log(`\nCompleted! ${results.filter(r => r.success).length}/${testPets.length} pets added successfully.`);
    return results;
  } catch (error) {
    console.error('Error populating test pets:', error);
    throw error;
  }
};

// If running directly (not recommended in production)
// Uncomment to run:
// populateTestPets().then(() => console.log('Done!')).catch(console.error);

