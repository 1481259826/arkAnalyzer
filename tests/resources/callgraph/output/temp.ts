/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Type} from 'class-transformer';
import {plainToclass} from 'class-transformer';


export class Car{
  data:string;
  test(): string {
    let $temp1: string;
    let $temp2: string;
    
    $temp1 = 'hello';
    console.log($temp1);
    $temp2 = 'hello. this is my car';
    return $temp2;
  }
}
export class User{
  id:number;
  firstName:string;
  lastName:string;
  Type car:Car;
}
export function deserialize(data: string): User {
  let jsonObj: any;
  let ans: User;
  let $temp2: AnonymousClass$deserialize$0;
  
  
  jsonObj = JSON.parse(data);
  $temp2 = new AnonymousClass$deserialize$0();
  ans = plainToclass(User,jsonObj,$temp2);
  return ans;
}
class AnonymousClass$deserialize$0{
}
export function test(data: string): void {
  let $temp2: User;
  let $temp3: any;
  let $temp4: any;
  
  
  $temp2 = deserialize(data);
  $temp3 = $temp2.car;
  $temp4 = $temp3.test();
  console.log($temp4);
  
}
