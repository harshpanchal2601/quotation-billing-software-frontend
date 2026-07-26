import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import PauseCircleOutlineOutlinedIcon from '@mui/icons-material/PauseCircleOutlineOutlined';
import Chip from '@mui/material/Chip';

type CompanyStatusChipProps = {
  isActive: boolean;
};

export function CompanyStatusChip({ isActive }: CompanyStatusChipProps) {
  return isActive ? (
    <Chip size="small" color="primary" icon={<CheckCircleOutlineOutlinedIcon />} label="Active" />
  ) : (
    <Chip size="small" color="default" icon={<PauseCircleOutlineOutlinedIcon />} label="Inactive" />
  );
}
