// services/policyEngine.js
// 4-State Evidence Taxonomy & Deterministic Policy Gate

const EvidenceState = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  UNKNOWN: 'UNKNOWN',
  CONFLICTING: 'CONFLICTING'
};

// 3 Industry Scenarios for Autonomous Agent Purchases
const SCENARIOS = {
  CONSUMER_FOOTWEAR: {
    id: 'CONSUMER_FOOTWEAR',
    category: 'B2C High-Spec Consumer',
    name: 'Nike Pegasus Trail 4 GORE-TEX (Size 10 US)',
    price: '135.00',
    description: 'Mandatory 100% waterproof trail running shoes for wet marathon',
    mandate: { waterproofRequired: true, maxPrice: '135.00' },
    validWarehouseSlip: 'WH-DEPOT-04: SKU NK-PEG4-GTX, Upper: Waterproof GORE-TEX Membrane Certified. Verified dispatch.',
    breachWarehouseSlip: 'WH-DEPOT-04: SKU NK-PEG4-MSH, Upper: Open-Hole Mesh. Equivalent Grade Substitution.',
    amendedPrice: '110.00',
    amendedProduct: 'Nike Pegasus 4 Open Mesh',
    breachReason: 'Merchant attempted substitution of open mesh for waterproof GORE-TEX.'
  },
  ENTERPRISE_HARDWARE: {
    id: 'ENTERPRISE_HARDWARE',
    category: 'B2B Cloud & Enterprise IT',
    name: '10x 64GB DDR5-5600 ECC Registered RDIMM',
    price: '850.00',
    description: 'Mission-critical database host RAM requiring ECC error correction',
    mandate: { eccRequired: true, maxPrice: '850.00' },
    validWarehouseSlip: 'SYS-DIST-09: SKU MEM-D5-64G-ECC, Samsung Original DDR5-5600 ECC RDIMM 10-pack verified.',
    breachWarehouseSlip: 'SYS-DIST-09: SKU MEM-D5-64G-UDIMM, Non-ECC Unbuffered Desktop DDR5 10-pack. High-grade replacement.',
    amendedPrice: '620.00',
    amendedProduct: '10x 64GB DDR5-5600 Non-ECC UDIMM',
    breachReason: 'Direct violation of server data integrity: Non-ECC RAM causes silent database bit-rot.'
  },
  INDUSTRIAL_MRO: {
    id: 'INDUSTRIAL_MRO',
    category: 'Industrial & Maritime MRO',
    name: 'Marine-Grade 316 Stainless Fasteners (500-pk)',
    price: '420.00',
    description: 'Saltwater saltwater-immersion bolts requiring 316 molybdenum alloy',
    mandate: { grade316Required: true, maxPrice: '420.00' },
    validWarehouseSlip: 'IND-FAST-12: 500x M12x60 Marine Grade 316 Stainless Steel Hex Bolts. Salt-spray certified.',
    breachWarehouseSlip: 'IND-FAST-12: 500x M12x60 Grade 304 Zinc-Coated Industrial Bolts. Equivalent metric strength.',
    amendedPrice: '310.00',
    amendedProduct: 'Grade 304 Zinc-Coated Industrial Bolts (500-pk)',
    breachReason: 'Grade 304 corrodes in saltwater within 90 days. Mandatory 316 molybdenum alloy missing.'
  }
};

/**
 * Normalizes raw warehouse packing slips into structured attributes.
 */
function interpretWarehouseSlip(warehouseText, scenarioId = 'CONSUMER_FOOTWEAR') {
  const text = (warehouseText || '').toLowerCase();
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.CONSUMER_FOOTWEAR;

  const extracted = {
    model: scenario.amendedProduct,
    price: scenario.amendedPrice,
    evidenceCitations: [],
    attributes: {}
  };

  // Scenario 1: Footwear Waterproofing
  if (scenarioId === 'CONSUMER_FOOTWEAR') {
    if (text.includes('gore-tex') || text.includes('waterproof gore-tex')) {
      extracted.attributes.waterproofing = EvidenceState.PRESENT;
      extracted.evidenceCitations.push('Waterproof GORE-TEX membrane certified on slip');
    } else if (text.includes('open-hole mesh') || text.includes('mesh')) {
      extracted.attributes.waterproofing = EvidenceState.UNKNOWN;
      extracted.evidenceCitations.push('Slip explicitly states Upper: Open-Hole Mesh');
      extracted.evidenceCitations.push('No waterproof membrane certification present');
    } else {
      // Defensive fail-closed: Unrecognized or corrupted slip
      extracted.attributes.waterproofing = EvidenceState.UNKNOWN;
      extracted.evidenceCitations.push('Unrecognized packing slip specification. Defaulting to UNKNOWN.');
    }
  }

  // Scenario 2: Server RAM ECC
  if (scenarioId === 'ENTERPRISE_HARDWARE') {
    if (text.includes('ecc rdimm') || text.includes('ecc registered')) {
      extracted.attributes.ecc = EvidenceState.PRESENT;
      extracted.evidenceCitations.push('ECC Error Correction certified on module slip');
    } else {
      extracted.attributes.ecc = EvidenceState.ABSENT;
      extracted.evidenceCitations.push('Slip specifies Non-ECC Unbuffered UDIMM');
      extracted.evidenceCitations.push('Zero hardware bit-rot error correction circuitry');
    }
  }

  // Scenario 3: Industrial MRO 316 vs 304
  if (scenarioId === 'INDUSTRIAL_MRO') {
    if (text.includes('grade 316') || text.includes('marine grade 316')) {
      extracted.attributes.grade316 = EvidenceState.PRESENT;
      extracted.evidenceCitations.push('Marine-Grade 316 Molybdenum alloy certified');
    } else {
      extracted.attributes.grade316 = EvidenceState.ABSENT;
      extracted.evidenceCitations.push('Slip specifies standard Grade 304 Zinc-coated alloy');
      extracted.evidenceCitations.push('Not certified for maritime saltwater immersion');
    }
  }

  return extracted;
}

/**
 * Deterministic Policy Gate.
 */
function evaluateAmendment(approvedBaseline, extractedEvidence, scenarioId = 'CONSUMER_FOOTWEAR') {
  const violations = [];
  const scenario = SCENARIOS[scenarioId] || SCENARIOS.CONSUMER_FOOTWEAR;

  if (scenarioId === 'CONSUMER_FOOTWEAR') {
    if (extractedEvidence.attributes?.waterproofing !== EvidenceState.PRESENT) {
      violations.push({
        attribute: 'Waterproofing Membrane',
        approved: '100% GORE-TEX Certified',
        proposed: 'Open-Hole Mesh (Waterproofing UNVERIFIED)',
        reason: scenario.breachReason
      });
    }
  } else if (scenarioId === 'ENTERPRISE_HARDWARE') {
    if (extractedEvidence.attributes?.ecc !== EvidenceState.PRESENT) {
      violations.push({
        attribute: 'Hardware Memory ECC',
        approved: 'Server ECC Registered RDIMM',
        proposed: 'Desktop Non-ECC UDIMM',
        reason: scenario.breachReason
      });
    }
  } else if (scenarioId === 'INDUSTRIAL_MRO') {
    if (extractedEvidence.attributes?.grade316 !== EvidenceState.PRESENT) {
      violations.push({
        attribute: 'Molybdenum Alloy Grade',
        approved: 'Marine Grade 316',
        proposed: 'Industrial Grade 304 Zinc-Coated',
        reason: scenario.breachReason
      });
    }
  }

  if (violations.length > 0) {
    return {
      permitted: false,
      requiresConsent: true,
      verdict: 'MATERIAL_SPEC_BREACH',
      summary: scenario.breachReason,
      violations
    };
  }

  return {
    permitted: true,
    requiresConsent: false,
    verdict: 'COMPLIANT_FULFILLMENT',
    violations: []
  };
}

module.exports = {
  EvidenceState,
  SCENARIOS,
  interpretWarehouseSlip,
  evaluateAmendment
};
