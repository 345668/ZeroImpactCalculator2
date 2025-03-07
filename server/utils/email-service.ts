import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
}

function getCurrentDate(): string {
  return new Date().toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export async function sendReportEmail(submission: any) {
  // Ensure numeric values
  const co2Savings = Number(submission.co2Savings);
  const carbonCredits = Number(submission.carbonCredits);
  const financialValue = Number(submission.financialValue);
  const currentConsumption = Number(submission.currentConsumption);
  const projectedConsumption = Number(submission.projectedConsumption);

  const emailContent = `
    Herr ${submission.lastName}, ${submission.firstName},

    CARBON_CREDIT_CALCULATION_REPORT
    -----------------------------------
    DATE_ASSESSED: ${getCurrentDate()}

    BUILDING_DATA
    -----------------------------------
    BUILDING_TYPE: Single-family house
    LOCATION: ${submission.address}
    AREA_SQM: ${submission.buildingSize}
    HEATING_SYSTEM: ${submission.heatingSystem}

    EMISSIONS_DATA
    -----------------------------------
    CURRENT_ENERGY_CONSUMPTION_KWH: ${formatNumber(currentConsumption)}
    FUTURE_ENERGY_CONSUMPTION_KWH: ${formatNumber(projectedConsumption)}

    CARBON_CREDITS
    -----------------------------------
    ANNUAL_REDUCTION_KG: ${formatNumber(co2Savings * 1000)}
    ANNUAL_CARBON_CREDITS_TONS: ${formatNumber(co2Savings)}
    CREDITING_PERIOD_YEARS: 10
    LIFETIME_CARBON_CREDITS_TONS: ${formatNumber(co2Savings * 10)}

    FINANCIAL_VALUE
    -----------------------------------
    CARBON_PRICE_EUR_PER_TON: 50
    ANNUAL_VALUE_EUR: ${formatNumber(financialValue)}
    LIFETIME_VALUE_EUR: ${formatNumber(financialValue * 10)}

    METHOD_NOTES
    -----------------------------------
    CALCULATION_METHOD: Direct CO2 emission values
    CONFIDENCE_LEVEL: High
    EMISSION_FACTOR_CURRENT: 0.202 kg CO₂/kWh (Natural gas)
    EMISSION_FACTOR_FUTURE: 0.343 kg CO₂/kWh (Electricity mix)

    Mit freundlichen Grüssen
    Philippe M Masindet

    Philippe Maitey Masindet
    CTO Radical Zero GmbH

    pmm@radical-zero.com
    Tel: +491746813185

    Radical Zero GmbH
    Local Carbon Offset Supply
    Co/Q:ARC
    Danziger Straße 145
    10407 Berlin

    Amtsgericht Charlottenburg (HRB 255861 B)
  `;

  const msg = {
    to: submission.email,
    from: 'sandsneptune@gmail.com',
    subject: 'Your Carbon Credit Calculation Report',
    text: emailContent,
    html: emailContent.replace(/\n/g, '<br>').replace(/\s{2,}/g, '&nbsp;&nbsp;')
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully to:', submission.email);
    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);

    // Check if it's a SendGrid API error with response body
    if (error?.response?.body) {
      const errorMessage = error.response.body.errors?.[0]?.message || 'Unknown SendGrid error';
      throw new Error(`Failed to send email: ${errorMessage}`);
    }

    // Generic error
    throw new Error('Failed to send email: Service temporarily unavailable');
  }
}