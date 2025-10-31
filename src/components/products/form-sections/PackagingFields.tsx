import React from 'react';
import { ProductFormData } from '../ProductFormPanel';
import { tipo_embalagem } from '../../../types/database.types';
import Section from '../../ui/forms/Section';
import Select from '../../ui/forms/Select';
import Input from '../../ui/forms/Input';
import PackagingIllustration from '../PackagingIllustration';
import { useNumericField } from '../../../hooks/useNumericField';

const tipoEmbalagemOptions: { value: tipo_embalagem; label: string }[] = [
    { value: 'pacote_caixa', label: 'Pacote / Caixa' },
    { value: 'envelope', label: 'Envelope' },
    { value: 'rolo_cilindro', label: 'Rolo / Cilindro' },
    { value: 'outro', label: 'Outro' },
];

interface PackagingFieldsProps {
  data: ProductFormData;
  onChange: (field: keyof ProductFormData, value: any) => void;
}

const PackagingFields: React.FC<PackagingFieldsProps> = ({ data, onChange }) => {
  const tipoEmbalagem = data.tipo_embalagem || 'pacote_caixa';

  const pesoLiquidoProps = useNumericField(data.peso_liquido_kg, (value) => onChange('peso_liquido_kg', value));
  const pesoBrutoProps = useNumericField(data.peso_bruto_kg, (value) => onChange('peso_bruto_kg', value));
  const larguraProps = useNumericField(data.largura_cm, (value) => onChange('largura_cm', value));
  const alturaProps = useNumericField(data.altura_cm, (value) => onChange('altura_cm', value));
  const comprimentoProps = useNumericField(data.comprimento_cm, (value) => onChange('comprimento_cm', value));
  const diametroProps = useNumericField(data.diametro_cm, (value) => onChange('diametro_cm', value));

  return (
    <Section
      title="Dimensões e peso"
      description="Informações logísticas para cálculo de frete e envio."
    >
      <div className="sm:col-span-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col justify-center">
          <Select
            label="Tipo de embalagem"
            name="tipo_embalagem"
            value={tipoEmbalagem}
            onChange={(e) => onChange('tipo_embalagem', e.target.value)}
            required
          >
            {tipoEmbalagemOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
          <PackagingIllustration type={tipoEmbalagem} />
        </div>
        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          <Select
            label="Embalagem"
            name="embalagem"
            value={data.embalagem || 'custom'}
            onChange={(e) => onChange('embalagem', e.target.value)}
            className="col-span-3"
          >
            <option value="custom">Embalagem Customizada</option>
          </Select>

          <Input
            label="Peso líquido"
            name="peso_liquido_kg"
            type="text"
            {...pesoLiquidoProps}
            endAdornment="kg"
            placeholder="0,000"
          />
          <Input
            label="Peso bruto"
            name="peso_bruto_kg"
            type="text"
            {...pesoBrutoProps}
            endAdornment="kg"
            placeholder="0,000"
          />
          <Input
            label="Nº de volumes"
            name="num_volumes"
            type="number"
            value={data.num_volumes || '1'}
            onChange={(e) => onChange('num_volumes', parseInt(e.target.value, 10) || 1)}
            placeholder="1"
          />

          {(tipoEmbalagem === 'pacote_caixa' || tipoEmbalagem === 'envelope') && (
            <Input
              label="Largura"
              name="largura_cm"
              type="text"
              {...larguraProps}
              endAdornment="cm"
              placeholder="0,0"
            />
          )}
          {tipoEmbalagem === 'pacote_caixa' && (
            <Input
              label="Altura"
              name="altura_cm"
              type="text"
              {...alturaProps}
              endAdornment="cm"
              placeholder="0,0"
            />
          )}
          {(tipoEmbalagem === 'pacote_caixa' || tipoEmbalagem === 'envelope' || tipoEmbalagem === 'rolo_cilindro') && (
            <Input
              label="Comprimento"
              name="comprimento_cm"
              type="text"
              {...comprimentoProps}
              endAdornment="cm"
              placeholder="0,0"
            />
          )}
          {tipoEmbalagem === 'rolo_cilindro' && (
            <Input
              label="Diâmetro"
              name="diametro_cm"
              type="text"
              {...diametroProps}
              endAdornment="cm"
              placeholder="0,0"
            />
          )}
        </div>
      </div>
    </Section>
  );
};

export default PackagingFields;
