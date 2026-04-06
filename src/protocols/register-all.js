import { registerProtocol } from './registry';
import workoutProtocol from './body/workout/index';
import peptideProtocol from './body/peptides/index';
import nutritionProtocol from './body/nutrition/index';
import citizenshipProtocol from './travel/citizenship/index';
import skincareProtocol from './image/skincare/index';
import mindProtocol from './mind/index';
import purposeProtocol from './purpose/index';

registerProtocol(workoutProtocol);
registerProtocol(peptideProtocol);
registerProtocol(nutritionProtocol);
registerProtocol(citizenshipProtocol);
registerProtocol(skincareProtocol);
registerProtocol(mindProtocol);
registerProtocol(purposeProtocol);
