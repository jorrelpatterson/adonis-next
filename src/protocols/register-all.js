import { registerProtocol } from './registry';
import workoutProtocol from './body/workout/index';
import peptideProtocol from './body/peptides/index';
import nutritionProtocol from './body/nutrition/index';

registerProtocol(workoutProtocol);
registerProtocol(peptideProtocol);
registerProtocol(nutritionProtocol);
