// Option lists sourced directly from the source "Child Labor Profiling
// Database" workbook's hidden "Codes" sheet (the actual data-validation
// lists behind the ENCODE tab's dropdowns) — see
// backend/scripts/seed-full-geography.mjs for how that sheet was read.
// Region/Province/Municipality now come from the real geography API instead
// of a static list (see PersonalInfoSection.jsx); Barangay is free text —
// the workbook has no barangay master list at all, so the real form doesn't
// validate it either (see backend/src/lib/geography.js).

export const livingWithOptions = [
  'UNKNOWN', 'N/A', 'Both Parents', 'Father only', 'Mother only',
  'Relatives', 'Non-Relatives', 'Living Alone',
]

export const dwellingMaterialOptions = [
  { code: 1, label: '1 - Strong materials' },
  { code: 2, label: '2 - Light materials' },
  { code: 3, label: '3 - Salvaged/makeshift materials' },
  { code: 4, label: '4 - Mixed but predominantly strong materials' },
  { code: 5, label: '5 - Mixed but predominantly light materials' },
  { code: 6, label: '6 - Mixed but predominantly savaged/makeshift materials' },
  { code: 7, label: '7 - No permanent dwelling unit' },
]

export const formOfEducationOptions = [
  'UNKNOWN', 'N/A', '1 – Formal', '2 – Non-Formal (Alternative Learning System)',
]

export const highestGradeOptions = [
  'UNKNOWN', 'N/A', 'No Grade Completed', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
  'Grade 5', 'Grade 6', 'Grade 7 / 1st Year HS', 'Grade 8 / 2nd Year HS',
  'Grade 9 / 3rd Year HS', 'Grade 10 / 4th Year HS', 'Grade 11', 'Grade 12',
  'Tech-Voc', 'College', 'Postgraduate', 'Others',
]

// "Check all that apply" list for "reason(s) for never attending or dropping
// out of school" — a distinct question from the single-select "main reason"
// code list elsewhere in the Codes sheet, which our schema doesn't model.
export const dropoutReasonOptions = [
  'To engage in paid or self-employment to augment family income',
  'To help in family operated farm or business',
  'Attend to household chores like taking care of family members',
  'Cannot afford to go to school',
  'Not interested in school',
  'School is too far',
  'Illness/ disability',
  'Teachers are not supportive',
  'Due to bullying',
  'Due to early pregnancy',
]

export const disabilityTypeOptions = [
  '1 – Hearing Impairment', '2 – Visual Impairment', '3 – Speech Difficulties',
  '4 – Orthopedic Disability', '5 – Multiple Disabilities', '6 – Mental Disability', '7 – Others',
]

export const ailmentOptions = [
  '1 – Measles', '2 – Chickenpox', '3 – Dengue', '4 – Typhoid',
  '5 – Tuberculosis / Primary Complex', '6 – Skin Disease', '7 – Allergies', '8 – Others',
]

export const familyAilmentOptions = [
  '1 – Hypertension', '2 – Diabetes', '3 – Asthma', '4 – Kidney Ailment',
  '5 – Liver Ailment', '6 – Heart Ailment', '7 – Cancer', '8 – Others',
]

// NOTE: the source Codes sheet's task list currently tops out at 12 items
// ending in "Others" — it does not have separate OSEC / "Children in
// Prostitution" categories the way an earlier version of this list here did.
// If those need to stay as distinct, explicitly-tracked categories, that's a
// deliberate addition on top of the source data, not something to silently
// carry over — flag it rather than re-adding without discussion.
export const taskPerformedOptions = [
  '1 – Mining', '2 – Quarrying', '3 – Construction', '4 – Transportation and Storage',
  '5 – Waste Management', '6 – Forestry and Logging', '7 – Fishing', '8 – Farming',
  '9 – Domestic Work', '10 – Manufacturing', '11 – Pyrotechnics production', '12 – Others',
]

export const workArrangementOptions = [
  '1 – Paid worker in own household-operated farm or business',
  '2 – Paid worker by an employer, financier, land owner',
  '3 – Worker without pay in own family-operated farm or business',
  '4 – Self-employed',
  '5 – Others',
]

export const hazardOptions = [
  '1 – Exposure to chemicals',
  '2 – Exposure to physical injuries',
  '3 – Exposure to possible suffocation (e.g. compressor mining)',
  '4 – Exposure to extreme weather conditions',
  '5 – Exposure to possible health complications',
  '6 – Exposure to accident-prone areas (e.g. falling timber)',
  '7 – Exposure to drowning (location of place of work)',
  '8 – Others',
]

export const paymentBasisOptions = [
  '1 – Hourly', '2 – Daily', '3 – Weekly', '4 – Monthly', '5 – Per gram',
  '6 – Per piece', '7 – Per task or pakyaw', '8 – In kind', '9 – Commission basis', '10 – Others',
]

export const earningsUseOptions = [
  '1 – Give all or part of earnings to my parents/guardian',
  '2 – Employer give all or parts of earnings to my parents/guardian',
  '3 – Pay for my tuition fees',
  '4 – Buy things for school needs',
  '5 – Buy things for household use',
  '6 – Buy things for myself',
  '7 – Save',
  '8 – Others',
]

export const workSupervisorOptions = [
  '1 – Parent/ Guardian', '2 – Elder brother or sister', '3 – Other relatives', '4 – Employer', '5 – Others',
]

export const religionOptions = [
  'Roman Catholic', 'Christian', 'Iglesia ni Cristo', 'Islam', 'No Religion', 'Others',
]

// Family-member fields the Codes sheet defines (civil status, skills) but
// FamilySection.jsx / the family_members MiniTable don't expose yet — kept
// here so the data is available when/if that section grows those columns.
export const civilStatusOptions = [
  '1 – Single', '2 – Married', '3 – Widowed', '4 – Legally Separated',
]

export const skillsOptions = [
  'Plumbing', 'Masonry', 'Carpentry', 'Welding', 'Automotive', 'Massage Therapy',
  'Electronics', 'Computer Technology', 'Sewing/ Upholstery Repair', 'Snack/Food Preparation',
  'Meat Processing', 'Driving', 'Cosmetology', 'Car Wash', 'Others',
]
