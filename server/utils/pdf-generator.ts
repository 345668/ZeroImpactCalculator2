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
         .text(`Current Energy Consumption: ${submission.currentConsumption} kWh/year`)
         .text(`Projected Energy Consumption: ${submission.projectedConsumption} kWh/year`);

      // Savings Analysis
      doc.moveDown(2);
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('Carbon Savings Analysis');

      const consumptionReduction = Number(submission.currentConsumption) - Number(submission.projectedConsumption);
      const reductionPercentage = (consumptionReduction / Number(submission.currentConsumption)) * 100;

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Energy Reduction: ${consumptionReduction.toFixed(2)} kWh/year (${reductionPercentage.toFixed(1)}%)`)
         .text(`CO₂ Savings: ${submission.co2Savings} tons/year`)
         .text(`Carbon Credits Generated: ${submission.carbonCredits}`)
         .text(`Financial Value: €${submission.financialValue}`);

      // 10-Year Projection
      doc.moveDown(2);
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .text('10-Year Projection');

      doc.fontSize(12)
         .font('Helvetica')
         .text(`Total CO₂ Savings: ${(Number(submission.co2Savings) * 10).toFixed(2)} tons`)
         .text(`Total Carbon Credits: ${(Number(submission.carbonCredits) * 10).toFixed(2)}`)
         .text(`Total Financial Value: €${(Number(submission.financialValue) * 10).toFixed(2)}`);

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
