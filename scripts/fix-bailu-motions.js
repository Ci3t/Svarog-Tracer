import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public', 'companions', 'bailu');
const modelPath = path.join(dir, 'bailu.model3.json');

let model = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

// Discover all .exp3.json files in the bailu folder
const files = fs.readdirSync(dir);
const expFiles = files.filter(f => f.endsWith('.exp3.json'));

model.FileReferences.Expressions = expFiles.map(f => ({
    Name: f.replace('.exp3.json', ''),
    File: f
}));

// Add Idle motion
model.FileReferences.Motions = {
    Idle: [
        { File: "motions/IDLE.motion3.json", FadeInTime: 0.5, FadeOutTime: 0.5 }
    ]
};

// Add ParamMouthOpenY to LipSync group if it's there
const lsGroup = model.Groups.find(g => g.Name === 'LipSync');
if (lsGroup) {
    lsGroup.Ids = ["ParamMouthOpenY"];
} else {
    model.Groups.push({
        Target: "Parameter",
        Name: "LipSync",
        Ids: ["ParamMouthOpenY"]
    });
}

fs.writeFileSync(modelPath, JSON.stringify(model, null, '\t'), 'utf8');
console.log('Added expressions and motions to bailu.model3.json');
