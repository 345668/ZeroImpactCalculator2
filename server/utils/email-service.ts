import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY environment variable is required');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendReportEmail(submission: any) {
  const msg = {
    to: submission.email,
    from: 'no-reply@radical-zero.com', // Replace with your verified sender
    subject: 'Your Carbon Credit Calculation Report',
    html: `
      <h1>Your Carbon Savings Report</h1>
      <p>Dear ${submission.firstName} ${submission.lastName},</p>
      
      <p>Here are your calculation results:</p>
      
      <h2>Carbon Savings Summary</h2>
      <ul>
        <li>CO₂ Savings: ${submission.co2Savings.toFixed(2)} tons/year</li>
        <li>Carbon Credits: ${submission.carbonCredits.toFixed(2)}</li>
        <li>Financial Value: €${submission.financialValue.toFixed(2)}</li>
      </ul>
      
      <h2>Building Details</h2>
      <ul>
        <li>Building Size: ${submission.buildingSize} m²</li>
        <li>Current Consumption: ${submission.currentConsumption} kWh/year</li>
        <li>Projected Consumption: ${submission.projectedConsumption} kWh/year</li>
        <li>Reduction: ${Math.round(((submission.currentConsumption - submission.projectedConsumption) / submission.currentConsumption) * 100)}%</li>
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
