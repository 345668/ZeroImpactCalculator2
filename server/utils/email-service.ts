import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
}

export async function sendReportEmail(submission: any) {
  // Ensure numeric values
  const co2Savings = Number(submission.co2Savings);
  const carbonCredits = Number(submission.carbonCredits);
  const financialValue = Number(submission.financialValue);
  const currentConsumption = Number(submission.currentConsumption);
  const projectedConsumption = Number(submission.projectedConsumption);

  const msg = {
    to: submission.email,
    from: 'no-reply@radical-zero.com',
    subject: 'Your Carbon Credit Calculation Report',
    html: `
      <h1>Your Carbon Savings Report</h1>
      <p>Dear ${submission.firstName} ${submission.lastName},</p>

      <p>Here are your calculation results:</p>

      <h2>Carbon Savings Summary</h2>
      <ul>
        <li>CO₂ Savings: ${formatNumber(co2Savings)} tons/year</li>
        <li>Carbon Credits: ${formatNumber(carbonCredits)}</li>
        <li>Financial Value: €${formatNumber(financialValue)}</li>
      </ul>

      <h2>Building Details</h2>
      <ul>
        <li>Building Size: ${submission.buildingSize} m²</li>
        <li>Current Consumption: ${formatNumber(currentConsumption)} kWh/year</li>
        <li>Projected Consumption: ${formatNumber(projectedConsumption)} kWh/year</li>
        <li>Reduction: ${Math.round(((currentConsumption - projectedConsumption) / currentConsumption) * 100)}%</li>
      </ul>

      <p>Thank you for using our Carbon Credit Calculator!</p>
    `,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}