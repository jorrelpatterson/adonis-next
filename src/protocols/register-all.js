import { registerProtocol } from './registry';
import workoutProtocol from './body/workout/index';
import peptideProtocol from './body/peptides/index';
import nutritionProtocol from './body/nutrition/index';
import creditProtocol from './money/credit/index';
import incomeProtocol from './money/income/index';

registerProtocol(workoutProtocol);
registerProtocol(peptideProtocol);
registerProtocol(nutritionProtocol);
registerProtocol(creditProtocol);
registerProtocol(incomeProtocol);

