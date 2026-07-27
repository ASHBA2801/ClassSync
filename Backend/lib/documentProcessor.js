// Document AI Processing Pipeline — Hackathon-ready simulation
// Mimics: Image upload → Preprocessing → OCR → Field Extraction → Confidence Scoring → Review Queue
// In production: replace extractFields() with Google Vision / Azure Form Recognizer / LLM call

const FORM_SCHEMAS = {
  admission: {
    fields: [
      { key: "studentName", label: "Student Full Name", type: "text" },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Other"] },
      { key: "grade", label: "Applying for Grade", type: "text" },
      { key: "parentName", label: "Parent/Guardian Name", type: "text" },
      { key: "parentEmail", label: "Parent Email", type: "email" },
      { key: "parentPhone", label: "Parent Phone", type: "text" },
      { key: "address", label: "Residential Address", type: "textarea" },
      { key: "previousSchool", label: "Previous School", type: "text" },
      { key: "bloodGroup", label: "Blood Group", type: "text" },
    ],
  },
  id_proof: {
    fields: [
      { key: "documentType", label: "Document Type", type: "text" },
      { key: "documentNumber", label: "Document Number", type: "text" },
      { key: "holderName", label: "Name on Document", type: "text" },
      { key: "issueDate", label: "Issue Date", type: "date" },
      { key: "expiryDate", label: "Expiry Date", type: "date" },
      { key: "issuingAuthority", label: "Issuing Authority", type: "text" },
    ],
  },
  marksheet: {
    fields: [
      { key: "studentName", label: "Student Name", type: "text" },
      { key: "rollNumber", label: "Roll Number", type: "text" },
      { key: "examYear", label: "Exam Year", type: "text" },
      { key: "class", label: "Class", type: "text" },
      { key: "subjects", label: "Subjects & Marks", type: "table" },
      { key: "totalMarks", label: "Total Marks", type: "number" },
      { key: "percentage", label: "Percentage", type: "number" },
      { key: "result", label: "Result", type: "text" },
      { key: "schoolName", label: "School Name", type: "text" },
    ],
  },
  leave_application: {
    fields: [
      { key: "applicantName", label: "Applicant Name", type: "text" },
      { key: "role", label: "Role", type: "select", options: ["Student", "Staff"] },
      { key: "class", label: "Class/Department", type: "text" },
      { key: "leaveFrom", label: "Leave From Date", type: "date" },
      { key: "leaveTo", label: "Leave To Date", type: "date" },
      { key: "reason", label: "Reason for Leave", type: "textarea" },
      { key: "contactDuringLeave", label: "Contact During Leave", type: "text" },
    ],
  },
};

// Simulated OCR extraction values per form type
const DEMO_EXTRACTIONS = {
  admission: {
    studentName: { value: "Arjun Mehta", confidence: 0.97 },
    dateOfBirth: { value: "2010-03-15", confidence: 0.91 },
    gender: { value: "Male", confidence: 0.99 },
    grade: { value: "10", confidence: 0.88 },
    parentName: { value: "Rakesh Mehta", confidence: 0.94 },
    parentEmail: { value: "rakesh.mehta@gmail.com", confidence: 0.82 },
    parentPhone: { value: "+91-9876543210", confidence: 0.95 },
    address: { value: "42 Green Park Colony, New Delhi - 110016", confidence: 0.74 },
    previousSchool: { value: "St. Xavier's School", confidence: 0.89 },
    bloodGroup: { value: "O+", confidence: 0.98 },
  },
  id_proof: {
    documentType: { value: "Aadhaar Card", confidence: 0.99 },
    documentNumber: { value: "XXXX-XXXX-4521", confidence: 0.96 },
    holderName: { value: "Arjun Mehta", confidence: 0.94 },
    issueDate: { value: "2018-06-10", confidence: 0.87 },
    expiryDate: { value: "N/A - Lifetime", confidence: 0.78 },
    issuingAuthority: { value: "UIDAI", confidence: 0.99 },
  },
  marksheet: {
    studentName: { value: "Priya Nair", confidence: 0.96 },
    rollNumber: { value: "TN-2025-1042", confidence: 0.93 },
    examYear: { value: "2025", confidence: 0.99 },
    class: { value: "10th Standard", confidence: 0.97 },
    subjects: {
      value: "Math:92, Science:88, English:79, Social Studies:85, Hindi:91",
      confidence: 0.81,
    },
    totalMarks: { value: "435/500", confidence: 0.89 },
    percentage: { value: "87.0%", confidence: 0.92 },
    result: { value: "PASS - First Division", confidence: 0.98 },
    schoolName: { value: "Kendriya Vidyalaya No.3", confidence: 0.95 },
  },
  leave_application: {
    applicantName: { value: "Mrs. Sunita Verma", confidence: 0.95 },
    role: { value: "Staff", confidence: 0.91 },
    class: { value: "Mathematics Department", confidence: 0.88 },
    leaveFrom: { value: "2026-08-04", confidence: 0.97 },
    leaveTo: { value: "2026-08-08", confidence: 0.96 },
    reason: { value: "Family medical emergency — mother hospitalized", confidence: 0.83 },
    contactDuringLeave: { value: "+91-9988776655", confidence: 0.94 },
  },
};

/**
 * Simulate AI document processing pipeline
 * @param {string} formType - "admission" | "id_proof" | "marksheet" | "leave_application"
 * @param {string} fileName - original file name
 * @param {string} schoolId
 * @returns {object} processingResult
 */
function processDocument(formType, fileName, schoolId) {
  const schema = FORM_SCHEMAS[formType];
  if (!schema) {
    return { success: false, error: `Unknown form type: ${formType}` };
  }

  const rawExtraction = DEMO_EXTRACTIONS[formType] || {};

  // Add realistic variance ± to each confidence score
  const extractedFields = {};
  let totalConfidence = 0;
  let fieldCount = 0;
  const lowConfidenceFields = [];

  for (const field of schema.fields) {
    const raw = rawExtraction[field.key];
    if (raw) {
      const variance = (Math.random() - 0.5) * 0.08; // ±4%
      const confidence = Math.min(1, Math.max(0.5, raw.confidence + variance));
      extractedFields[field.key] = {
        label: field.label,
        value: raw.value,
        confidence: Math.round(confidence * 100) / 100,
        requiresReview: confidence < 0.85,
        fieldType: field.type,
      };
      if (confidence < 0.85) {
        lowConfidenceFields.push(field.label);
      }
      totalConfidence += confidence;
      fieldCount++;
    } else {
      // Field not found by OCR
      extractedFields[field.key] = {
        label: field.label,
        value: "",
        confidence: 0,
        requiresReview: true,
        fieldType: field.type,
      };
      lowConfidenceFields.push(field.label);
      fieldCount++;
    }
  }

  const overallConfidence = fieldCount > 0 ? totalConfidence / fieldCount : 0;
  const status = overallConfidence >= 0.85 ? "Reviewed" : "Pending";
  const processingMs = Math.floor(Math.random() * 800) + 400; // 400-1200ms simulated

  return {
    success: true,
    document: {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      schoolId,
      fileName,
      formType,
      uploadedBy: "Admin",
      uploadedAt: new Date().toISOString(),
      status,
      extractedData: extractedFields,
      confidence: Math.round(overallConfidence * 100) / 100,
      reviewNotes: lowConfidenceFields.length > 0
        ? `${lowConfidenceFields.length} field(s) need human review: ${lowConfidenceFields.join(", ")}`
        : "All fields extracted with high confidence",
      linkedStudentId: null,
      processingMs,
    },
    pipeline: {
      steps: [
        { name: "Image Upload", status: "complete", ms: 120 },
        { name: "Preprocessing (deskew + denoise)", status: "complete", ms: 180 },
        { name: "OCR Text Extraction", status: "complete", ms: Math.floor(processingMs * 0.4) },
        { name: "Field Classification (AI)", status: "complete", ms: Math.floor(processingMs * 0.3) },
        { name: "Confidence Scoring", status: "complete", ms: 80 },
        {
          name: "Human Review Queue",
          status: lowConfidenceFields.length > 0 ? "flagged" : "skipped",
          ms: 20,
        },
        {
          name: "ERP Write",
          status: status === "Reviewed" ? "ready" : "pending_review",
          ms: 0,
        },
      ],
      overallConfidence: Math.round(overallConfidence * 100),
      lowConfidenceFields,
      autoApproved: overallConfidence >= 0.85,
    },
    schema: schema.fields.map((f) => ({ key: f.key, label: f.label, type: f.type })),
  };
}

/**
 * Write extracted document data into the ERP store (simulation)
 * Returns the student record fields to pre-fill
 */
function getErpPayload(formType, extractedData) {
  if (formType === "admission") {
    return {
      name: extractedData.studentName?.value || "",
      grade: extractedData.grade?.value || "",
      parentName: extractedData.parentName?.value || "",
      parentEmail: extractedData.parentEmail?.value || "",
      status: "Enrolled",
      attendanceRate: 100,
      gpa: "N/A",
    };
  }
  return { note: "Document data reviewed and archived." };
}

module.exports = { processDocument, getErpPayload, FORM_SCHEMAS };
