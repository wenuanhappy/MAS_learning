import { Component, OnInit } from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {FormsModule} from '@angular/forms';
import {NgClass, NgIf} from '@angular/common';
import {Router} from '@angular/router';
import {ApiService} from '../services/api.service';

@Component({
  selector: 'app-user-register',
  templateUrl: './user-register.component.html',
  imports: [
    FormsModule,
    NgClass,
    NgIf
  ],
  styleUrls: ['./user-register.component.css']
})

export class UserRegisterComponent implements OnInit {
  username = '';
  password = '';
  email = '';
  register() {
    const httpOptions = {
      headers: new HttpHeaders({'Content-Type': 'application/json'}),
    };
    this.http.post(this.api.apiUrl('/user/register'),
      {
        name: this.username,
        password: this.password,
        email: this.email,
      }, httpOptions).subscribe((response:any)=> {
        if(response.code == 200){
          alert("注册成功！");
          this.router.navigate(['/login']);
        }else{
          alert("注册失败：" + response.message);
        }
    });
  }
  constructor(public http:HttpClient, private router:Router, private api: ApiService) { }

  ngOnInit() {
  }

}
