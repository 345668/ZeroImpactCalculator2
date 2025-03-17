import PDFDocument from "pdfkit";
import type { Submission } from "@shared/schema";

interface ChartData {
  date: string;
  value: number;
}

export async function generatePDFReport(submission: Submission): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(25)
         .font('Helvetica-Bold')
         .text('Carbon Credits Analysis Report', { align: 'center' });

      doc.moveDown();
      doc.fontSize(12)
         .font('Helvetica')
         .text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });

      // Building Information
      doc.moveDown(2);
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Building Information');

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Building Size: ${submission.buildingSize} m²`)
         .text(`Current Energy Source: ${submission.currentEnergySource}`)
         .text(`Current Energy Consumption: ${submission.currentConsumption} ${submission.currentEnergySource === 'gas' ? 'm³' : submission.currentEnergySource === 'oil' ? 'L' : 'kg'}/year`)
         .text(`Projected Electricity Consumption: ${submission.projectedConsumption} kWh/year`);

      // Detailed Calculations
      doc.moveDown(2);
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Detailed Energy Analysis');

      const calculationDetails = typeof submission.calculationDetails === 'string' 
        ? JSON.parse(submission.calculationDetails)
        : submission.calculationDetails;

      if (calculationDetails) {
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Current Energy in kWh: ${calculationDetails.currentConsumptionKWh.toFixed(2)} kWh/year`)
           .text(`Current CO₂ Emissions: ${calculationDetails.currentCO2Emissions.toFixed(2)} kg CO₂/year`)
           .text(`New System CO₂ Emissions: ${calculationDetails.newCO2Emissions.toFixed(2)} kg CO₂/year`)
           .text(`Annual CO₂ Savings: ${calculationDetails.annualCO2Savings.toFixed(2)} tons CO₂/year`);
      }

      // Carbon Credit Analysis
      doc.moveDown(2);
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Carbon Credits Analysis');

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Annual CO₂ Savings: ${submission.co2Savings} tons CO₂/year`)
         .text(`Annual Carbon Credits: ${submission.carbonCredits}`)
         .text(`Annual Financial Value: €${submission.financialValue}`);

      // 10-Year Projection
      doc.moveDown(2);
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('10-Year Projection');

      if (calculationDetails?.tenYearProjection) {
        const { tenYearProjection } = calculationDetails;
        doc.fontSize(12)
           .font('Helvetica')
           .text(`Total CO₂ Savings: ${tenYearProjection.co2Savings} tons`)
           .text(`Total Carbon Credits: ${tenYearProjection.carbonCredits}`)
           .text(`Total Financial Value: €${tenYearProjection.financialValue}`);
      }

      // Energy Reduction Analysis
      if (calculationDetails?.energyReductionPercent) {
        doc.moveDown(2);
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('Energy Reduction Analysis');

        doc.fontSize(12)
           .font('Helvetica')
           .text(`Energy Reduction: ${calculationDetails.energyReductionPercent}%`)
           .text(`Current Energy Consumption: ${calculationDetails.currentConsumptionKWh.toFixed(2)} kWh/year`)
           .text(`Projected Energy Consumption: ${submission.projectedConsumption} kWh/year`);
      }

      // Recommendations
      doc.moveDown(2);
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Recommendations');

      doc.fontSize(12)
         .font('Helvetica')
         .text('1. Continue monitoring energy consumption patterns')
         .text('2. Consider additional energy efficiency improvements')
         .text('3. Review maintenance schedules for optimal performance')
         .text('4. Explore additional carbon credit opportunities');

      // Footer
      doc.moveDown(2);
      doc.fontSize(10)
         .font('Helvetica')
         .text('This report was generated automatically by the Carbon Credits Calculator.', { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}