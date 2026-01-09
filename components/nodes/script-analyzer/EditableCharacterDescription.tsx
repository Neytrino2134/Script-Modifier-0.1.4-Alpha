
import React, { useState, useEffect } from 'react';

export const EditableCharacterDescription: React.FC<{
    fullDescription: string;
    onDescriptionChange: (newDescription: string) => void;
    readOnly?: boolean;
    t: (key: string) => string;
    onFocus?: () => void;
}> = React.memo(({ fullDescription, onDescriptionChange, readOnly = false, t, onFocus }) => {
    const [sections, setSections] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        const parsed: { [key: string]: string } = { 'Appearance': '', 'Personality': '', 'Clothing': '' };
        const keyMap: { [key: string]: 'Appearance' | 'Personality' | 'Clothing' } = {
            'Внешность': 'Appearance', 'Личность': 'Personality', 'Характер': 'Personality', 'Одежда': 'Clothing',
            'Appearance': 'Appearance', 'Personality': 'Personality', 'Clothing': 'Clothing'
        };
        const sectionRegex = /####\s*(Appearance|Personality|Clothing|Внешность|Личность|Характер|Одежда)\s*([\s\S]*?)(?=####|$)/gi;
    
        let match;
        let foundMatch = false;
        while ((match = sectionRegex.exec(fullDescription)) !== null) {
            foundMatch = true;
            const key = keyMap[match[1].trim() as keyof typeof keyMap];
            const value = match[2].trim();
            if (key) {
                parsed[key] = value;
            }
        }

        if (!foundMatch && fullDescription.trim()) {
            parsed['Appearance'] = fullDescription.trim();
        }
        
        setSections(parsed);
    }, [fullDescription]);
    
    const handleSectionChange = (key: string, value: string) => {
        const newSections = { ...sections, [key]: value };
        const newFullDescription = `#### Appearance\n${newSections['Appearance'] || ''}\n\n#### Personality\n${newSections['Personality'] || ''}\n\n#### Clothing\n${newSections['Clothing'] || ''}`;
        onDescriptionChange(newFullDescription);
    };

    return (
        <div className="space-y-2 text-sm">
            {(['Appearance', 'Personality', 'Clothing'] as const).map(key => (
                <div key={key}>
                    <h5 className="font-semibold text-gray-400 text-xs uppercase tracking-wider">{t(`node.content.${key.toLowerCase()}`) || key}</h5>
                    <textarea
                        value={sections[key] || ''}
                        onChange={e => handleSectionChange(key, e.target.value)}
                        readOnly={readOnly}
                        className="w-full text-sm p-2 bg-gray-900 border-none rounded-md resize-y min-h-[60px] focus:outline-none focus:ring-1 focus:ring-emerald-500 custom-scrollbar overflow-y-scroll read-only:bg-gray-900/50 read-only:text-gray-400"
                        onWheel={e => e.stopPropagation()}
                        onFocus={onFocus}
                    />
                </div>
            ))}
        </div>
    );
});
