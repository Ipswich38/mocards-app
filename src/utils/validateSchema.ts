// MOCARDS CLOUD - Schema Validation Utilities
// Validates that application schema matches database schema

import { PHILIPPINES_REGIONS, AREA_CODES } from '../lib/schema';

// Validation function to ensure all codes are properly formatted
export function validateRegionsAndCodes() {
  console.log('🔍 Validating MOCARDS Schema...');

  // Check regions
  console.log(`📍 Total regions: ${PHILIPPINES_REGIONS.length}`);
  console.log('📍 Regions:', PHILIPPINES_REGIONS.map(r => `${r.code}: ${r.name}`));

  // Validate Region 4B (MIMAROPA) is included
  const mimaropa = PHILIPPINES_REGIONS.find(r => r.code === '4B');
  if (mimaropa) {
    console.log('✅ Region 4B (MIMAROPA) found:', mimaropa.name);
  } else {
    console.error('❌ Region 4B (MIMAROPA) missing!');
  }

  // Validate Custom region is included
  const customRegion = PHILIPPINES_REGIONS.find(r => r.code === 'CUSTOM');
  if (customRegion) {
    console.log('✅ Custom region found:', customRegion.name);
  } else {
    console.error('❌ Custom region missing!');
  }

  // Check clinic codes
  console.log(`🏥 Total clinic codes: ${AREA_CODES.length}`);

  // Validate CVT codes (should be CVT001 to CVT016)
  const cvtCodes = AREA_CODES.filter(code => code.startsWith('CVT'));
  console.log(`🏥 CVT codes: ${cvtCodes.length} (should be 16)`, cvtCodes);

  // Validate BTG codes (should be BTG001 to BTG016)
  const btgCodes = AREA_CODES.filter(code => code.startsWith('BTG'));
  console.log(`🏥 BTG codes: ${btgCodes.length} (should be 16)`, btgCodes);

  // Validate LGN codes (should be LGN001 to LGN016)
  const lgnCodes = AREA_CODES.filter(code => code.startsWith('LGN'));
  console.log(`🏥 LGN codes: ${lgnCodes.length} (should be 16)`, lgnCodes);

  // Validate MIM codes (should be MIM001 to MIM016)
  const mimCodes = AREA_CODES.filter(code => code.startsWith('MIM'));
  console.log(`🏥 MIM codes: ${mimCodes.length} (should be 16)`, mimCodes);

  // Validate special codes
  const specialCodes = AREA_CODES.filter(code =>
    code === 'Others' || code === 'Custom'
  );
  console.log(`🏥 Special codes: ${specialCodes.length} (should be 2)`, specialCodes);

  // Validation summary
  const allValid =
    mimaropa &&
    customRegion &&
    cvtCodes.length === 16 &&
    btgCodes.length === 16 &&
    lgnCodes.length === 16 &&
    mimCodes.length === 16 &&
    specialCodes.length === 2;

  if (allValid) {
    console.log('✅ All schema validations passed!');
    console.log(`📊 Summary: ${PHILIPPINES_REGIONS.length} regions, ${AREA_CODES.length} clinic codes`);
  } else {
    console.error('❌ Schema validation failed! Check missing components above.');
  }

  return allValid;
}

// Function to generate sample control numbers for testing
export function generateSampleControlNumbers() {
  console.log('🎯 Generating sample control numbers for testing...');

  const samples = [
    { region: '4A', code: 'CVT001', sample: 'MOC-10001-4A-CVT001' },
    { region: '4A', code: 'CVT016', sample: 'MOC-10016-4A-CVT016' },
    { region: '4A', code: 'BTG001', sample: 'MOC-20001-4A-BTG001' },
    { region: '4A', code: 'BTG016', sample: 'MOC-20016-4A-BTG016' },
    { region: '4A', code: 'LGN001', sample: 'MOC-30001-4A-LGN001' },
    { region: '4A', code: 'LGN016', sample: 'MOC-30016-4A-LGN016' },
    { region: '4B', code: 'MIM001', sample: 'MOC-40001-4B-MIM001' },
    { region: '4B', code: 'MIM016', sample: 'MOC-40016-4B-MIM016' },
    { region: 'CUSTOM', code: 'Custom', sample: 'MOC-50001-CUSTOM-Custom' },
  ];

  samples.forEach(({ region, code, sample }) => {
    console.log(`📋 ${region} + ${code} = ${sample}`);
  });

  return samples;
}

// Cloud-native validation
export function validateCloudConfiguration() {
  console.log('☁️ Validating cloud-native configuration...');

  // Check if environment variables are properly set
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('🔧 Environment check:');
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Supabase Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);

  const cloudValid = !!supabaseUrl && !!supabaseKey;

  if (cloudValid) {
    console.log('✅ Cloud configuration valid!');
  } else {
    console.error('❌ Cloud configuration invalid! Check environment variables.');
  }

  return cloudValid;
}

// Export all validation functions
export default {
  validateRegionsAndCodes,
  generateSampleControlNumbers,
  validateCloudConfiguration
};