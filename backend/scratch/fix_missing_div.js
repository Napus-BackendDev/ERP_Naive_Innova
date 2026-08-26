import fs from 'fs';

const path = 'C:/Users/asus/Desktop/naive/MES/frontend/src/components/dashboard/ProductionView.js';
let code = fs.readFileSync(path, 'utf8');

// Insert the closing </div> for the grid container below the Production Queue Card
const target = `          </div>
        </Card>

            {/* 3. Filters and Search Row */}`;

const replacement = `          </div>
        </Card>
      </div>

      {/* 3. Filters and Search Row */}`;

code = code.replace(target, replacement);
fs.writeFileSync(path, code, 'utf8');
console.log("Fixed missing closing div in ProductionView.js!");
