// Translates between the encode form's nested per-section formData shape
// (see EncodeChildProfile.jsx / the components/encode/* sections) and the
// flat, snake_case-ish shape GET/PATCH /api/profiles/:id use — see
// backend/src/routes/profiles.routes.js's FIELD_MAP for the column side.
import { createBlankFormData } from '../data/blankFormData.js'

function yesNo(v) {
  if (v === true) return 'Yes'
  if (v === false) return 'No'
  return ''
}

function str(v) {
  return v ?? ''
}

function num(v) {
  return v == null ? '' : String(v)
}

// GET /api/profiles/:id response -> the nested shape PersonalInfoSection etc. read.
export function toFormData({ profile, familyMembers, servicesAvailed, servicesRequested }) {
  const blank = createBlankFormData()
  return {
    personal: {
      lastName: str(profile.last_name),
      firstName: str(profile.first_name),
      middleName: str(profile.middle_name),
      region: profile.present_region_name || blank.personal.region,
      province: profile.present_province_name || blank.personal.province,
      municipality: profile.present_city_name || blank.personal.municipality,
      barangay: str(profile.present_barangay_text),
      sitio: str(profile.present_sitio),
      phone: str(profile.present_phone),
      sex: profile.sex || 'Male',
      dob: str(profile.date_of_birth),
      birthCertificate: yesNo(profile.birth_certificate),
      religion: profile.religion || blank.personal.religion,
      indigenous: yesNo(profile.indigenous_group),
      livingWith: profile.living_with || blank.personal.livingWith,
      dwellingMaterial: profile.dwelling_material || blank.personal.dwellingMaterial,
    },
    education: {
      everWentToSchool: yesNo(profile.ever_attended_school),
      attendingNow: yesNo(profile.attending_now),
      highestGrade: str(profile.highest_grade),
      formOfEducation: profile.form_of_education || blank.education.formOfEducation,
      ageStopped: num(profile.age_stopped_schooling),
      dropoutReasons: profile.dropout_reasons ?? [],
    },
    health: {
      hasDisability: yesNo(profile.has_disability),
      height: num(profile.height_cm),
      weight: num(profile.weight_kg),
      ailments: profile.ailments ?? [],
      familyAilments: profile.family_ailments ?? [],
    },
    work: {
      taskPerformed: profile.task_performed || blank.work.taskPerformed,
      ageStarted: num(profile.age_started_working),
      workArrangement: profile.work_arrangement || blank.work.workArrangement,
      hoursPerDay: num(profile.hours_per_day),
      daysPerWeek: num(profile.days_per_week),
      hazards: profile.hazards ?? [],
    },
    family: {
      members: familyMembers.map((m) => ({
        name: str(m.name),
        relationship: str(m.relationship),
        age: num(m.age),
        occupation: str(m.occupation),
        income: num(m.monthly_income),
      })),
      is4Ps: yesNo(profile.is_4ps),
      householdId: str(profile.household_id_number),
    },
    servicesAvailed: {
      records: servicesAvailed.map((r) => ({
        assistance: str(r.assistance),
        source: str(r.source),
        year: str(r.year_availed),
        availedBy: str(r.availed_by),
        remarks: str(r.remarks),
      })),
    },
    servicesRequested: {
      records: servicesRequested.map((r) => ({
        assistance: str(r.assistance),
        source: str(r.source),
        period: str(r.period),
        requestedBy: str(r.requested_by),
        remarks: str(r.remarks),
      })),
    },
  }
}

// The nested formData shape -> a flat PATCH body matching profiles.routes.js's
// FIELD_MAP (top-level keys) plus familyMembers/servicesAvailed/servicesRequested
// arrays for wholesale sub-table replacement.
export function toPatchPayload(formData) {
  return {
    ...formData.personal,
    ...formData.education,
    ...formData.health,
    ...formData.work,
    is4Ps: formData.family.is4Ps,
    householdId: formData.family.householdId,
    familyMembers: formData.family.members,
    servicesAvailed: formData.servicesAvailed.records,
    servicesRequested: formData.servicesRequested.records,
  }
}
