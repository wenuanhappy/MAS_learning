import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SharedService } from './shared';

export const authGuard: CanActivateFn = () => {
  const sharedService = inject(SharedService);
  const router = inject(Router);

  if (sharedService.isLoggedIn) {
    return true;
  }

  alert('请先登录！');
  router.navigate(['/login']);
  return false;
};
