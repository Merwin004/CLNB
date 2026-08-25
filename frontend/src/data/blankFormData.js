import {
  religionOptions,
  livingWithOptions,
  dwellingMaterialOptions,
  formOfEducationOptions,
  taskPerformedOptions,
  workArrangementOptions,
} from './formOptions.js'

// A fresh, unfilled record for a brand-new profile (or before a profile's
// real data has loaded). Most select-backed fields default to their first
// static option so every <select> stays controlled; region/province/
// municipality default to '' instead since their options load live from the
// geography API (see PersonalInfoSection.jsx) and start out empty. Barangay
// is free text (no master list — see lib/geography.js), so it's just ''.
// Text/number fields and multi-selects start empty too, matching an actual
// new draft.
export function createBlankFormData({ lastName = '', firstName = '' } = {}) {
  return {
    personal: {
      lastName,
      firstName,
      middleName: '',
      region: '',
      province: '',
      municipality: '',
      barangay: '',
      sitio: '',
      phone: '',
      sex: 'Male',
      dob: '',
      birthCertificate: 'Yes',
      religion: religionOptions[0],
      indigenous: 'No',
      livingWith: livingWithOptions[0],
      dwellingMaterial: dwellingMaterialOptions[0].label,
    },
    education: {
      everWentToSchool: 'Yes',
      attendingNow: 'Yes',
      highestGrade: '',
      formOfEducation: formOfEducationOptions[0],
      ageStopped: '',
      dropoutReasons: [],
    },
    health: {
      hasDisability: 'No',
      height: '',
      weight: '',
      ailments: [],
      familyAilments: [],
    },
    work: {
      taskPerformed: taskPerformedOptions[0],
      ageStarted: '',
      workArrangement: workArrangementOptions[0],
      hoursPerDay: '',
      daysPerWeek: '',
      hazards: [],
    },
    family: {
      members: [],
      is4Ps: 'No',
      householdId: '',
    },
    servicesAvailed: { records: [] },
    servicesRequested: { records: [] },
  }
}
